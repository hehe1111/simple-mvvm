function Compiler(el, vm) {
  this.$el = this.isElementNode(el)
    ? el
    : document.querySelector(el)
  this.$vm = vm
  if (this.$el) {
    this.$fragment = this.node2Fragment(this.$el)
    // 初始化，把 this.$fragment 交给编译器处理为解析后的内容
    this.compile(this.$fragment)
    // 将编译后的 DOM 片段加回到 DOM 中
    this.$el.appendChild(this.$fragment)
  }
}

Compiler.prototype = {
  constructor: Compiler,
  isElementNode(node) {
    return node.nodeType === 1
  },
  isTextNode(node) {
    return node.nodeType === 3
  },
  isDirective(attributeName) {
    return attributeName.indexOf('v-') >= 0
  },
  node2Fragment(node) {
    const fragment = document.createDocumentFragment()
    let child = null
    while (child = node.firstChild) {
      fragment.appendChild(child)
    }
    return fragment
  },
  compile(template) {
    const childNodes = template.childNodes
    Array.from(childNodes).forEach(node => {
      const regexp = /\{\{(.*)\}\}/
      let expression = node.textContent
      if (this.isTextNode(node) && regexp.test(expression)) {
        // expression = expression.replace(regexp, '$1').trim()
        expression = RegExp.$1.trim()
        this.compileText(node, expression)
      } else if (this.isElementNode(node)) {
        this.compileElement(node)
      }
    })
  },
  compileText(node, text) {
    compileUtil.text(node, this.$vm, text)
  },
  compileElement(node) {
    // 递归编译，从而实现编译嵌套标签的文本节点及属性节点
    this.compile(node)
    // 编译 HTML 属性节点
    const nodeAttributes = node.attributes
    Array.from(nodeAttributes).forEach(attribute => {
      const attributeName = attribute.name
      if (this.isDirective(attributeName)) {
        const expression = attribute.value
        const directiveType = attributeName.split('-')[1]
        // 仅支持 v-text v-model
        compileUtil[directiveType] && compileUtil[directiveType](node, this.$vm, expression)
      }
    })
  },
}

const compileUtil = {
  text(node, vm, expression) {
    this.bind(node, vm, expression, 'text')
  },
  model(node, vm, expression) {
    this.bind(node, vm, expression, 'model')
    const value = this.getVModelValue(vm, expression)
    node.addEventListener('input', (event) => {
      let newValue = event.target.value
      if (newValue === value) return
      this.setVModelValue(vm, expression, newValue)
    })
  },
  bind(node, vm, expression, type) {
    const updaterFn = updater[type + 'Updater']
    updaterFn && updaterFn(node, vm[expression])
    // 为表达式或者指令关注的属性，添加观察者
    new Watcher(vm, expression, (newValue, oldValue) => {
      updaterFn && updaterFn(node, newValue, oldValue)
    })
  },
  getVModelValue(vm, expression) {
    return vm[expression]
  },
  setVModelValue(vm, expression, value) {
    vm[expression] = value
  },
}

const updater = {
  textUpdater(node, value) {
    node.textContent = (typeof value === 'undefined' ? '' : value)
  },
  modelUpdater(node, value) {
    node.value = (typeof value === 'undefined' ? '' : value)
  }
}
