function MVVM(options={}) {
  this.$options = options
  let el = this.$options.el || document.body
  let data = this.$data = this.$options.data

  // 让 MVVM 实例代理 data 上的数据
  Object.keys(data).forEach(key => {
    Object.defineProperty(this, key, {
      configurable: false,
      enumerable: true,
      get() {
        return data[key]
      },
      set(newValue) {
        data[key] = newValue
      }
    })
  })

  observe(data)

  this.$compiler = new Compiler(el, this)
}
