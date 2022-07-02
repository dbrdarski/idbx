export default Object.freeze({
  create (name) {
    if (localStorage.hasOwnProperty(name)){
      throw Error ("Database already exists!")
    }
    localStorage.setItem(name, "")
  },
  open (name) {
    return localStorage.getItem(name)
  },
  write (name, output) {
    return localStorage.setItem(name, `${localStorage.getItem(name)}${output}`)
  }
})
