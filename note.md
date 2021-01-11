# Simple-MVVM 笔记

## index.html

- HTML 模板

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>MVVM</title>
</head>
<body>
  <div id="app">
    <h1>{{ title }}</h1>
    {{ message }}
    <p>
      <ul>
        <li>{{ message }}</li>
      </ul>
    </p>
    <input type="text" v-model="vmodel" autofocus>
    <p>实时结果：<span style="color: red; word-break: break-all;">{{ vmodel }}</span></p>
    <p v-text="vtext"></p>
  </div>

  <script src="./dep.js"></script>
  <script src="./observer.js"></script>
  <script src="./watcher.js"></script>
  <script src="./compiler.js"></script>
  <script src="./mvvm.js"></script>
  <script>
    const vm = new MVVM({
      el: '#app',
      data:{
        title: '尝试写一个简单的 MVVM，实现 v-model v-text 和文本插值',
        message: '可在嵌套 HTML 标签内进行文本插值',
        vmodel: '编译 v-model 指令成功',
        vtext: '编译 v-text 指令成功',
      },
    })
  </script>
</body>
</html>
```

## observer.js

```javascript
// observer.js
function observe(data) {
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
      if (newValue === value) {
        return
      }
      value = newValue // 注释 2
      dep.notify() // 注释 3
    }
  })
}
```

- 注释 1
  - `Dep.target && dep.addSub(Dep.target)` 添加 `Watcher` 实例
- 注释 2
  - `value = newValue` 这里需要将 `newValue` 赋给 `value` ，是因为由于对 `get` 进行了拦截，当 `target.key` 的值发生改变时， `get` 返回的仍然是 `value` ，而不是 `target.key` 实时对应的值，因此要确保 `value` 与 `newValue` 同步
- 注释 3
  - `dep.notify()` 属性的值（数据）发生改变，就发出通知，遍历该属性对应的事件中心数组 `dep.subs`，执行每个 `Watcher` 实例，最终更新视图

## watcher.js

```javascript
// watcher.js
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
    this.value = newValue
    this.callback.call(this.vm, newValue, oldValue)
  }
}
```

- 注释 1
  - `this.value = this.get()` 通过一次手动取值，触发 MVVM 实例上的属性的取值函数，进而触发 `data` 上对应属性的取值函数，从而将 `Watcher` 实例添加进事件中心数组 `dep.subs`
- 注释 2
  - `Dep.target = this` 将当前 `Watcher` 实例记录到一个全局变量，方便在对应的 `data` 上的属性的取值函数中，将其记录到事件中心数组 `dep.subs`
  - `Dep.target = this` 不能放在 `Watcher.prototype.get()` 方法中，否则会导致每次进行取值操作时，也会将已经添加过的 `Watcher` 实例重复添加进事件中心数组 `dep.subs`
  - `Dep.target = this` 应该是只在创建 `Watcher` 实例时（`new Watcher()`）赋值。在 `this.value = this.get()` 手动触发一次取值事件时，然后重置 `Dep.target` 为 null，避免重复添加 `Watcher` 实例
  - **每个响应式属性各自有一个事件中心数组 `dep.subs`**，**可以有**多个 `Watcher` 实例。**一个插值/指令对应一个 `Watcher` 实例**
- 注释 3
  - 添加 `Watcher` 实例完成后，就重置全局变量 `Dep.target`，避免重复添加

## compiler.js

- `Node.appendChild()`
  - [附注](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/appendChild#Notes)
    > 如果被插入的节点已经存在于当前文档的文档树中,则那个节点会**首先从原先的位置移除,然后再插入到新的位置**.
    >
    > 如果你需要保留这个子节点在原先位置的显示,则你需要先用 `Node.cloneNode` 方法复制出一个节点的副本,然后在插入到新位置
- 通过**递归**来编译嵌套标签
- **在编译模板时，为每一个插值/指令各自添加一个 Watcher 实例**

```javascript
// compiler.js

// ...

node2Fragment(node) {
  const fragment = document.createDocumentFragment()
  let child = null
  // 将 node 的子元素依次转移到 fragment 中
  while (child = node.firstChild) {
    fragment.appendChild(child)
  }
  return fragment
},

// ...

compileElement(node) {
  // 递归编译，从而实现编译嵌套标签的文本节点及属性节点
  this.compile(node)

  // 编译 HTML 属性节点
  // ...
},

// ...

bind(node, vm, expression, type) {
  const updaterFn = updater[type + 'Updater']
  updaterFn && updaterFn(node, vm[expression])
  // 为表达式或者指令关注的属性，添加观察者 Watcher 实例
  new Watcher(vm, expression, (newValue, oldValue) => {
    updaterFn && updaterFn(node, newValue, oldValue)
  })
},
```

## 总结 1

- 将 `data` 上的数据通过 `Object.defineProperty()` 代理到 Vue 实例上（实际上也等同于将对 Vue 实例上的数据的访问劫持到 `data` 上），这样就可以通过 Vue 实例直接操作 `data`
- 在编译模板时，为模板上的每个插值/指令绑定一个 `Watcher` 实例（要传入一个回调，用于将新数据更新到视图），用于后续当 `data` 上的数据改变时，可以触发传入 `Watcher` 的回调，从而更新视图。**特别要注意的是，在生成 `Watcher` 实例时，通过手动获取 `data` 上的属性的值，来触发取值函数，同时需要借助一个全局属性 `Dep.target` 来记录 `Watcher` 实例，从而方便后续在 `Obverser` 中将 `Watcher` 实例添加到 `Dep` 实例的事件中心数组**
- 在 `Obverser` 中对 `data` 进行监听，用 `Object.defineProperty` 来劫持对 `data` 的访问。**每个响应式数据都会有一个独立的事件中心数组，这个事件中心数组用于存放 `Watcher` 实例**。在取值函数（`get`）中，借助全局属性 `Dep.target` 来获取 `Watcher` 实例，从而实现将 `Watcher` 实例添加到 `Dep` 实例的事件中心数组。在赋值函数（`set`）中，通过 `Dep` 实例来遍历事件中心数组，执行每个 `Watcher` 实例，调用传入 `Watcher` 实例的回调，从而更新视图。

## 总结 2：流程（2019.09.18 更新）

- MVVM 构造函数将 `data` 下的每个响应式属性都**代理**到 `vm` 实例上
- `observe` 函数通过 `Object.defineProperty` 劫持 `data` 下的响应式属性（添加 `getter` / `setter` 来拦截属性的取值 / 赋值），并且每一个响应式属性都有自己的 `Dep` 实例
- **compiler 方法编译模板，收集依赖**（通过**正则**解析指令和文本插值变量`{{xxx}}`），将 `vm` 实例和变量一起传入 `Watcher` 构造函数，从而为每一个指令和文本插值变量各自添加一个 `watcher` 实例，同时会在 `watcher` 实例上创建响应式属性的同名属性和值（`this.expression = expression; this.value = value`）
- `observe` 函数拦截响应式属性的取 / 赋值（`getter` / `setter`），编译模板时的依赖收集则为响应式属性绑定多个 `watcher` 实例
  - 在为响应式属性绑定 `watcher` 实例时，会去执行一次响应式属性的取值函数（`getter`），而在该取值函数（`getter`）中，会将 `watcher` 实例推入到事件中心数组中；为响应式属性赋值时，除了更新 `vm` 实例上的属性和 `data` 上的属性的值，还会去调用响应式属性的赋值函数（`setter`），从而遍历事件中心数组，调用 `notify` 函数，从而调用 `watcher` 实例的 `update` 函数，来更新页面上显示的值。即：更新时，有两处更新：`vm` 实例和 `data` 上的属性；页面上显示的值（`textContent` / `value`）

## 2021.1.11 更新

> [剖析 Vue.js 内部运行机制 - Vue.js 运行机制全局概览](https://juejin.cn/book/6844733705089449991/section/6844733705211084808)
>
> 在修改对象的值的时候，会触发对应的 setter， setter 通知之前「依赖收集」得到的 Dep 中的每一个 Watcher，告诉它们自己的值改变了，需要重新渲染视图。这时候这些 Watcher 就会开始调用 update 来更新视图，当然这中间还有一个 patch 的过程以及使用队列来异步更新的策略

评论区

> 通知所有的 watcher 是指对应的 dep 保存的所有 watcher。**进行数据劫持的时候，循环遍历 data 中所有的属性，一个属性就会创建一个唯一的 dep**，当**初始化解析编译界面的时候，一个指令/表达式就是一个 watcher**，那么解析指令/表达式的值的时候就去读 data 中的属性，触发 getter，再触发添加 dep 添加订阅（将 watcher 添加到 dep.subs 中），当修改对应的属性的时候，触发 setter，那么就再去触发这个 dep 保存的所有 watcher。

> Dep.target 可以理解成相当于一个全局变量，为了依赖收集

## 参考链接

- [剖析 Vue 实现原理 - 如何实现双向绑定 mvvm](https://github.com/DMQ/mvvm)
