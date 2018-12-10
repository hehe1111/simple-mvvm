function observe (data) {
  if (!data || typeof data !== 'object') {
    return
  }

  Object.keys(data).forEach(key => {
    defineReactive(data, key, data[key])
  })
}

function defineReactive(target, key, value) {
  const dep = new Dep()

  // 深度监听嵌套子对象
  observe(value)

  Object.defineProperty(target, key, {
    configurable: false,
    enumerable: true,
    get() {
      Dep.target && dep.addSub(Dep.target) // 注释 1
      return value
    },
    set(newValue) {
      if (newValue === value) { return }
      value = newValue // 注释 2
      dep.notify() // 注释 3
    }
  })
}

/**
 * 注释 1
 * Dep.target && dep.addSub(Dep.target)
 * 添加 Watcher 实例
 *
 * 注释 2
 * value = newValue
 * 这里需要将 newValue 赋给 value，是因为对 get 进行了拦截，
 * 当 target.key 的值发生改变时，get 返回的仍然是 value，而不是 target.key 实时对应的值，
 * 因此要确保 value 与 newValue 同步
 *
 * 注释 3
 * dep.notify()
 * 数据发生改变，就发出通知，遍历事件中心数组 dep.subs，执行每个 Watche 实例，最终更新视图
 */
