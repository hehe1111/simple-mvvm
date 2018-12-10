function Dep() {
  this.subs = []
}

Dep.prototype = {
  constructor: Dep,
  // 订阅
  addSub(sub) {
    // sub 是一个 Watcher 实例
    this.subs.push(sub)
  },
  // 发布
  notify() {
    this.subs.forEach(sub => sub.update()) // 触发观察者的更新，进而视图更新
  },
}
