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
  // id (size = 10) {
  //   const id = crypto.getRandomValues(new Uint16Array(size)
  //   return Array.from(id).map(x => String.fromCharCode(x)).join("")
  // }
})
