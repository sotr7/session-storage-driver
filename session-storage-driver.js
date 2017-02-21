export default class SessionStorageDriver {
  constructor (params) {
    Object.assign(this, params)
    let {$window} = this
    
    this.serializer = null
    this.sessionStorage = null
    this._driver = 'SessionStorageDriver'
    this._support = this._support.bind(this)
    this._initStorage = this._initStorage.bind(this)
    this.clear = this.clear.bind(this)
    this.iterate = this.iterate.bind(this)
    this.getItem = this.getItem.bind(this)
    this.key = this.key.bind(this)
    this.keys = this.keys.bind(this)
    this.length = this.length.bind(this)
    this.removeItem = this.removeItem.bind(this)
    this.setItem = this.setItem.bind(this)
    
    if (this.getSupport()) {
      this.sessionStorage = $window.sessionStorage
    }
    else {
        return null
    }
  }
  
  getSupport () {
    let {$window} = this
    try {
      if ($window.sessionStorage && ('setItem' in $window.sessionStorage)) {
        return true
      }
    } 
    catch (e) {
      /*eslint no-console: ["error", { allow: ["error"] }] */
      console.error(e)
    }

    return false
  }

  _initStorage (options) {
    let self = this
    let dbInfo = {}
    if (options) {
      for (let i in options) {
        dbInfo[i] = options[i]
      }
    }

    dbInfo.keyPrefix = dbInfo.name + '/'

    self._dbInfo = dbInfo

    let serializerPromise = localforage.getSerializer()

    return serializerPromise.then((lib) => {
        this.serializer = lib
        return Promise.resolve()
    })
  }

  _support () {
    return new Promise ((resolve/*, reject*/) => {
      resolve(this.getSupport())
    })
  }  

// the app's key/value store!
  clear (callback) {
    let self = this
    let promise = new Promise((resolve, reject) => {
      try {
        let keyPrefix = self._dbInfo.keyPrefix
  
        for (let i = this.sessionStorage.length - 1; i >= 0; i--) {
          let key = this.sessionStorage.key(i)
  
          if (key.indexOf(keyPrefix) === 0) {
            this.sessionStorage.removeItem(key)
          }
        }
        resolve()
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    
    return promise
  }

// If a key's value is `undefined`, we pass that value to the callback.
  getItem (key, callback) {
    let self = this

    if (typeof key !== 'string') {
      window.console.warn(key + ' used as a key, but it is not a string.')
      key = String(key)
    }

    let promise = new Promise((resolve, reject) => {
      try {
        let dbInfo = self._dbInfo
        let result = this.sessionStorage.getItem(dbInfo.keyPrefix + key)
  
        if (result) {
          result = this.serializer.deserialize(result)
        }
        resolve(result)
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    return promise
  }

  iterate (iterator, callback) {
    let self = this
    let promise = new Promise((resolve, reject) => {
      try {
        let keyPrefix = self._dbInfo.keyPrefix
        let keyPrefixLength = keyPrefix.length
        let length = this.sessionStorage.length
  
        for (let i = 0; i < length; i++) {
          let key = this.sessionStorage.key(i)
          let value = this.sessionStorage.getItem(key)
  
          if (value) {
            value = this.serializer.deserialize(value)
          }
  
          value = iterator(value, key.substring(keyPrefixLength), i + 1)
  
          if (value !== void(0)) {
            resolve(value)
          }
        }
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    return promise
  }

  key (n, callback) {
    let self = this
    let promise = new Promise((resolve, reject) => {
      try {
        let dbInfo = self._dbInfo
        let result
        try {
          result = this.sessionStorage.key(n)
        } 
        catch (error) {
          result = null
        }
  
        if (result) {
          result = result.substring(dbInfo.keyPrefix.length)
        }
        resolve(result)
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    return promise
  }

  keys (callback) {
    let self = this
    let promise = new Promise((resolve, reject) => {
      try {
        let dbInfo = self._dbInfo
        let length = this.sessionStorage.length
        let keys = []
  
        for (let i = 0; i < length; i++) {
          if (this.sessionStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
            keys.push(this.sessionStorage.key(i).substring(dbInfo.keyPrefix.length))
          }
        }
        resolve(keys)
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    return promise
  }

  length (callback) {
    let self = this
    let promise = self.keys().then((keys) => {
      return keys.length
    })
    
    this.executeCallback(promise, callback)
    return promise
  }

  removeItem (key, callback) {
    let self = this

    if (typeof key !== 'string') {
        window.console.warn(key + ' used as a key, but it is not a string.')
      key = String(key)
    }

    let promise = new Promise((resolve, reject) => {
      try {
        let dbInfo = self._dbInfo
        this.sessionStorage.removeItem(dbInfo.keyPrefix + key)
        resolve()
      }
      catch (error) {
        reject(error)
      }
    })

    this.executeCallback(promise, callback)
    return promise
  }

  setItem (key, value, callback) {
    let self = this

    if (typeof key !== 'string') {
      window.console.warn(key + ' used as a key, but it is not a string.')
      key = String(key)
    }

    if (value === undefined) {
      value = null
    }

    let originalValue = value

    let promise = new Promise ((resolve, reject) => {
      this.serializer.serialize(value, (value, error) => {
        if (error) {
          reject(error)
        } 
        else {
          try {
            let dbInfo = self._dbInfo
            this.sessionStorage.setItem(dbInfo.keyPrefix + key, value)
            resolve(originalValue)
          } 
          catch (e) {
            if (e.name === 'QuotaExceededError' ||
                e.name === 'SSD_ERROR_QUOTA_EXCEEDED') {
                reject(e)
            }
            reject(e)
          }
        }
      })
    })

    this.executeCallback(promise, callback)
    return promise
  }
  
  executeCallback (promise, callback) {
    if (callback) {
      promise.then((result) => {
        callback(null, result)
      }, (error) => {
        callback(error)
      })
    }
  }

}

app.provider('SessionStorageDriver', function SessionStorageDriverProvider () {
  this.$get = ['$window', function SessionStorageDriverFactory ($window) {
     return new SessionStorageDriver({$window})
  }]
})
                  
app.factory('SessionStorageDriver', [ '$window', ($window) => {
  return new SessionStorageDriver({$window})
}])

