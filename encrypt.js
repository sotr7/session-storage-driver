// Not ideal, but limitations of using javascript
const pbkdf2_iterations = 10

export default class Crypto {
  constructor ($q, I18n) {
    this.$q = $q
    this.I18n = I18n
  }

  encrypt (data, password) {
    let salt = CryptoJS.lib.WordArray.random(16)

    let key256Bits = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: pbkdf2_iterations
    })

    let encrypted = CryptoJS.AES.encrypt(data, key256Bits, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Iso10126,
      iv: salt
    })

    return this.$q.when(CryptoJS.enc.Base64.stringify(salt.concat(encrypted.ciphertext)))
  }

  decrypt (data, password) {
    //iso10126 with pbkdf2_iterations iterations
    try {
      let parsed_data = CryptoJS.enc.Base64.parse(data),
        salt = CryptoJS.lib.WordArray.create(parsed_data.words.splice(0, 4))

      parsed_data.sigBytes -= 16

      let key256Bits = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: pbkdf2_iterations
      })

      var decoded = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({ciphertext: parsed_data}),
        key256Bits,
        {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Iso10126,
          iv: salt
        }
      )

      if (decoded != null && decoded.sigBytes > 0) {
        return this.$q.when(CryptoJS.enc.Utf8.stringify(decoded))
      }
      else {
        throw this.I18n.crypto.something_wrong
      }
    }
    catch (e) {
      return this.$q.reject(e)
    }

    return this.$q.when()
  }
}

app.factory('Crypto', ($q, I18n) => new Crypto($q, I18n))
