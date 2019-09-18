function Watcher(vm, expression, callback) {
  this.vm = vm
  this.expression = expression
  this.callback = callback

  Dep.target = this // 注释 2
  this.value = this.get() // 注释 1
}

Watcher.prototype = {
  constructor: Watcher,
  get() {
    const value = this.vm[this.expression]
    Dep.target = null // 注释 3
    return value
  },
  update() {
    const newValue = this.get()
    const oldValue = this.value
    if (newValue === oldValue) return
    this.value = newValue // 这一句可以不要
    this.callback.call(this.vm, newValue, oldValue)
  },
}

/**
 * 注释 1
 * this.value = this.get() 或者只写 this.get() 就可以了
 * 因为 this.value 其实用不到，重要的是，手动调用一次 this.get()
 * 通过一次手动取值，触发 MVVM 实例上的属性的取值函数，
 * 进而触发 data 上对应属性的取值函数，
 * 从而将 Watcher 实例添加进事件中心数组 dep.subs
 *
 * 注释 2
 * Dep.target = this
 * 将当前 Watcher 实例记录到一个全局变量，
 * 方便在对应的 data 上的属性的取值函数中，将其记录到事件中心数组 dep.subs
 * 不能放在 Watcher.prototype.get() 方法中，
 * 否则会导致每次进行取值操作时，也会将已经添加过的 Watcher 实例重复添加进事件中心数组 dep.subs
 * Dep.target = this 应该是只在 new Watcher() 创建 Watcher 实例时赋值
 * 在 this.value = this.get() 手动触发一次取值事件时，就重置 Dep.target，避免重复添加 Watcher 实例
 *
 * 每个响应式属性均各自有一个 Water 实例，均各自有一个事件中心数组 dep.subs
 *
 * 注释 3
 * 添加 Water 实例完成后，就重置全局变量 Dep.target，避免重复添加
 */
