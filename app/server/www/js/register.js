'use strict';

function createElement(query, ns) {
  const {
    tag,
    id,
    className
  } = parse(query);
  const element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  if (id) {
    element.id = id;
  }
  if (className) {
    {
      element.className = className;
    }
  }
  return element;
}
function parse(query) {
  const chunks = query.split(/([.#])/);
  let className = "";
  let id = "";
  for (let i = 1; i < chunks.length; i += 2) {
    switch (chunks[i]) {
      case ".":
        className += ` ${chunks[i + 1]}`;
        break;
      case "#":
        id = chunks[i + 1];
    }
  }
  return {
    className: className.trim(),
    tag: chunks[0] || "div",
    id
  };
}
function html(query, ...args) {
  let element;
  const type = typeof query;
  if (type === "string") {
    element = createElement(query);
  } else if (type === "function") {
    const Query = query;
    element = new Query(...args);
  } else {
    throw new Error("At least one argument required");
  }
  parseArgumentsInternal(getEl(element), args);
  return element;
}
const el = html;
html.extend = function extendHtml(...args) {
  return html.bind(this, ...args);
};
function doUnmount(child, childEl, parentEl) {
  const hooks = childEl.__redom_lifecycle;
  if (hooksAreEmpty(hooks)) {
    childEl.__redom_lifecycle = {};
    return;
  }
  let traverse = parentEl;
  if (childEl.__redom_mounted) {
    trigger(childEl, "onunmount");
  }
  while (traverse) {
    const parentHooks = traverse.__redom_lifecycle || {};
    for (const hook in hooks) {
      if (parentHooks[hook]) {
        parentHooks[hook] -= hooks[hook];
      }
    }
    if (hooksAreEmpty(parentHooks)) {
      traverse.__redom_lifecycle = null;
    }
    traverse = traverse.parentNode;
  }
}
function hooksAreEmpty(hooks) {
  if (hooks == null) {
    return true;
  }
  for (const key in hooks) {
    if (hooks[key]) {
      return false;
    }
  }
  return true;
}

/* global Node, ShadowRoot */

const hookNames = ["onmount", "onremount", "onunmount"];
const shadowRootAvailable = typeof window !== "undefined" && "ShadowRoot" in window;
function mount(parent, _child, before, replace) {
  let child = _child;
  const parentEl = getEl(parent);
  const childEl = getEl(child);
  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }
  if (child !== childEl) {
    childEl.__redom_view = child;
  }
  const wasMounted = childEl.__redom_mounted;
  const oldParent = childEl.parentNode;
  if (wasMounted && oldParent !== parentEl) {
    doUnmount(child, childEl, oldParent);
  }
  {
    parentEl.appendChild(childEl);
  }
  doMount(child, childEl, parentEl, oldParent);
  return child;
}
function trigger(el, eventName) {
  if (eventName === "onmount" || eventName === "onremount") {
    el.__redom_mounted = true;
  } else if (eventName === "onunmount") {
    el.__redom_mounted = false;
  }
  const hooks = el.__redom_lifecycle;
  if (!hooks) {
    return;
  }
  const view = el.__redom_view;
  let hookCount = 0;
  view?.[eventName]?.();
  for (const hook in hooks) {
    if (hook) {
      hookCount++;
    }
  }
  if (hookCount) {
    let traverse = el.firstChild;
    while (traverse) {
      const next = traverse.nextSibling;
      trigger(traverse, eventName);
      traverse = next;
    }
  }
}
function doMount(child, childEl, parentEl, oldParent) {
  if (!childEl.__redom_lifecycle) {
    childEl.__redom_lifecycle = {};
  }
  const hooks = childEl.__redom_lifecycle;
  const remount = parentEl === oldParent;
  let hooksFound = false;
  for (const hookName of hookNames) {
    if (!remount) {
      // if already mounted, skip this phase
      if (child !== childEl) {
        // only Views can have lifecycle events
        if (hookName in child) {
          hooks[hookName] = (hooks[hookName] || 0) + 1;
        }
      }
    }
    if (hooks[hookName]) {
      hooksFound = true;
    }
  }
  if (!hooksFound) {
    childEl.__redom_lifecycle = {};
    return;
  }
  let traverse = parentEl;
  let triggered = false;
  if (remount || traverse?.__redom_mounted) {
    trigger(childEl, remount ? "onremount" : "onmount");
    triggered = true;
  }
  while (traverse) {
    const parent = traverse.parentNode;
    if (!traverse.__redom_lifecycle) {
      traverse.__redom_lifecycle = {};
    }
    const parentHooks = traverse.__redom_lifecycle;
    for (const hook in hooks) {
      parentHooks[hook] = (parentHooks[hook] || 0) + hooks[hook];
    }
    if (triggered) {
      break;
    }
    if (traverse.nodeType === Node.DOCUMENT_NODE || shadowRootAvailable && traverse instanceof ShadowRoot || parent?.__redom_mounted) {
      trigger(traverse, remount ? "onremount" : "onmount");
      triggered = true;
    }
    traverse = parent;
  }
}
function setStyle(view, arg1, arg2) {
  const el = getEl(view);
  if (typeof arg1 === "object") {
    for (const key in arg1) {
      setStyleValue(el, key, arg1[key]);
    }
  } else {
    setStyleValue(el, arg1, arg2);
  }
}
function setStyleValue(el, key, value) {
  el.style[key] = value == null ? "" : value;
}

/* global SVGElement */

const xlinkns = "http://www.w3.org/1999/xlink";
function setAttrInternal(view, arg1, arg2, initial) {
  const el = getEl(view);
  const isObj = typeof arg1 === "object";
  if (isObj) {
    for (const key in arg1) {
      setAttrInternal(el, key, arg1[key]);
    }
  } else {
    const isSVG = el instanceof SVGElement;
    const isFunc = typeof arg2 === "function";
    if (arg1 === "style" && typeof arg2 === "object") {
      setStyle(el, arg2);
    } else if (isSVG && isFunc) {
      el[arg1] = arg2;
    } else if (arg1 === "dataset") {
      setData(el, arg2);
    } else if (!isSVG && (arg1 in el || isFunc) && arg1 !== "list") {
      el[arg1] = arg2;
    } else {
      if (isSVG && arg1 === "xlink") {
        setXlink(el, arg2);
        return;
      }
      if (arg1 === "class") {
        setClassName(el, arg2);
        return;
      }
      if (arg2 == null) {
        el.removeAttribute(arg1);
      } else {
        el.setAttribute(arg1, arg2);
      }
    }
  }
}
function setClassName(el, additionToClassName) {
  if (additionToClassName == null) {
    el.removeAttribute("class");
  } else if (el.classList) {
    el.classList.add(additionToClassName);
  } else if (typeof el.className === "object" && el.className && el.className.baseVal) {
    el.className.baseVal = `${el.className.baseVal} ${additionToClassName}`.trim();
  } else {
    el.className = `${el.className} ${additionToClassName}`.trim();
  }
}
function setXlink(el, arg1, arg2) {
  if (typeof arg1 === "object") {
    for (const key in arg1) {
      setXlink(el, key, arg1[key]);
    }
  } else {
    if (arg2 != null) {
      el.setAttributeNS(xlinkns, arg1, arg2);
    } else {
      el.removeAttributeNS(xlinkns, arg1, arg2);
    }
  }
}
function setData(el, arg1, arg2) {
  if (typeof arg1 === "object") {
    for (const key in arg1) {
      setData(el, key, arg1[key]);
    }
  } else {
    if (arg2 != null) {
      el.dataset[arg1] = arg2;
    } else {
      delete el.dataset[arg1];
    }
  }
}
function text(str) {
  return document.createTextNode(str != null ? str : "");
}
function parseArgumentsInternal(element, args, initial) {
  for (const arg of args) {
    if (arg !== 0 && !arg) {
      continue;
    }
    const type = typeof arg;
    if (type === "function") {
      arg(element);
    } else if (type === "string" || type === "number") {
      element.appendChild(text(arg));
    } else if (isNode(getEl(arg))) {
      mount(element, arg);
    } else if (arg.length) {
      parseArgumentsInternal(element, arg);
    } else if (type === "object") {
      setAttrInternal(element, arg, null);
    }
  }
}
function getEl(parent) {
  return parent.nodeType && parent || !parent.el && parent || getEl(parent.el);
}
function isNode(arg) {
  return arg?.nodeType;
}

function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}
function _createClass(e, r, t) {
  return Object.defineProperty(e, "prototype", {
    writable: false
  }), e;
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function (r) {
      return Object.getOwnPropertyDescriptor(e, r).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function (r) {
      _defineProperty(e, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return e;
}
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o,
    r,
    i = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}

var _excluded$3 = ["text"];
var FormHeader = /*#__PURE__*/_createClass(function FormHeader(props) {
  _classCallCheck(this, FormHeader);
  props.text;
    var otherProps = _objectWithoutProperties(props, _excluded$3);
  this.el = el("h1", _extends({
    "class": "text-center"
  }, otherProps), props.text);
});

var _excluded$2 = ["label", "key"];
var FormInputPassword = /*#__PURE__*/_createClass(function FormInputPassword(props) {
  _classCallCheck(this, FormInputPassword);
  var label = props.label,
    key = props.key,
    otherProps = _objectWithoutProperties(props, _excluded$2);
  var inputId = "base-input-".concat(key);
  this.el = el("div", null, el("label", {
    "for": inputId,
    "class": "form-label"
  }, label), el("input", _extends({
    id: inputId,
    type: "password",
    "class": "form-control"
  }, otherProps)));
});

var _excluded$1 = ["label", "key"];
var FormInputEmail = /*#__PURE__*/_createClass(function FormInputEmail(props) {
  _classCallCheck(this, FormInputEmail);
  var label = props.label,
    key = props.key,
    otherProps = _objectWithoutProperties(props, _excluded$1);
  var inputId = "base-input-".concat(key);
  this.el = el("div", null, el("label", {
    "for": inputId,
    "class": "form-label"
  }, label), el("input", _extends({
    id: inputId,
    type: "email",
    "class": "form-control"
  }, otherProps, {
    required: true
  })));
});

var FormSwitchLabel = /*#__PURE__*/_createClass(function FormSwitchLabel(props) {
  _classCallCheck(this, FormSwitchLabel);
  this.el = el("p", null, el("small", null, "".concat(props.text, " "), el("a", {
    href: props.link
  }, props.linkText)));
});

var _excluded = ["text", "type"];
var FormButton = /*#__PURE__*/_createClass(function FormButton(props) {
  _classCallCheck(this, FormButton);
  props.text;
    var type = props.type,
    otherProps = _objectWithoutProperties(props, _excluded);
  var bootstrapBtnType = "btn-light";
  switch (type) {
    case "success":
      bootstrapBtnType = "btn-success";
      break;
    case "danger":
      bootstrapBtnType = "btn-danger";
      break;
  }

  // This instantiation is needed because
  // redom + babel fails to render a jsx with
  // complex className i.e. <div class="class other-class"/>
  var btn = Object.assign(document.createElement("button"), _objectSpread2({
    type: "button",
    className: "btn ".concat(bootstrapBtnType, " w-100"),
    textContent: props.text
  }, otherProps));
  this.el = el("div", {
    "class": "text-center"
  }, btn);
});

var Register = el("div", {
  "class": "container-md"
}, el("div", {
  "class": "mb-3"
}, new FormHeader({
  text: "Регистрация"
})), el("div", {
  "class": "mb-3"
}, new FormInputEmail({
  label: "E-mail",
  placeholder: "*@*.*",
  key: "email"
})), el("div", {
  "class": "mb-3"
}, new FormInputPassword({
  label: "Пароль",
  placeholder: "*",
  key: "pwd"
})), el("div", {
  "class": "mb-4"
}, new FormInputPassword({
  label: "Повторите пароль",
  placeholder: "*",
  key: "pwd-repeat"
}), new FormSwitchLabel({
  text: "Уже есть аккаунт?",
  linkText: "Войти",
  link: "./login.html"
})), new FormButton({
  text: "Зарегистрироваться",
  type: "success"
}));
mount(document.getElementById("main"), Register);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2NsaWVudC9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lcy5qcyIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy9mb3Jtcy9Gb3JtSGVhZGVyLmpzeCIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy9mb3Jtcy9Gb3JtSW5wdXRQYXNzd29yZC5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvZm9ybXMvRm9ybUlucHV0RW1haWwuanN4IiwiLi4vLi4vLi4vY2xpZW50L3NyYy9jb21wb25lbnRzL2Zvcm1zL0Zvcm1Td2l0Y2hMYWJlbC5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvZm9ybXMvRm9ybUJ1dHRvbi5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL3BhZ2VzL3JlZ2lzdGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQocXVlcnksIG5zKSB7XG4gIGNvbnN0IHsgdGFnLCBpZCwgY2xhc3NOYW1lIH0gPSBwYXJzZShxdWVyeSk7XG4gIGNvbnN0IGVsZW1lbnQgPSBuc1xuICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcpXG4gICAgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG5cbiAgaWYgKGlkKSB7XG4gICAgZWxlbWVudC5pZCA9IGlkO1xuICB9XG5cbiAgaWYgKGNsYXNzTmFtZSkge1xuICAgIGlmIChucykge1xuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbGVtZW50LmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZWxlbWVudDtcbn1cblxuZnVuY3Rpb24gcGFyc2UocXVlcnkpIHtcbiAgY29uc3QgY2h1bmtzID0gcXVlcnkuc3BsaXQoLyhbLiNdKS8pO1xuICBsZXQgY2xhc3NOYW1lID0gXCJcIjtcbiAgbGV0IGlkID0gXCJcIjtcblxuICBmb3IgKGxldCBpID0gMTsgaSA8IGNodW5rcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHN3aXRjaCAoY2h1bmtzW2ldKSB7XG4gICAgICBjYXNlIFwiLlwiOlxuICAgICAgICBjbGFzc05hbWUgKz0gYCAke2NodW5rc1tpICsgMV19YDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCIjXCI6XG4gICAgICAgIGlkID0gY2h1bmtzW2kgKyAxXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNsYXNzTmFtZTogY2xhc3NOYW1lLnRyaW0oKSxcbiAgICB0YWc6IGNodW5rc1swXSB8fCBcImRpdlwiLFxuICAgIGlkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBodG1sKHF1ZXJ5LCAuLi5hcmdzKSB7XG4gIGxldCBlbGVtZW50O1xuXG4gIGNvbnN0IHR5cGUgPSB0eXBlb2YgcXVlcnk7XG5cbiAgaWYgKHR5cGUgPT09IFwic3RyaW5nXCIpIHtcbiAgICBlbGVtZW50ID0gY3JlYXRlRWxlbWVudChxdWVyeSk7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY29uc3QgUXVlcnkgPSBxdWVyeTtcbiAgICBlbGVtZW50ID0gbmV3IFF1ZXJ5KC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkF0IGxlYXN0IG9uZSBhcmd1bWVudCByZXF1aXJlZFwiKTtcbiAgfVxuXG4gIHBhcnNlQXJndW1lbnRzSW50ZXJuYWwoZ2V0RWwoZWxlbWVudCksIGFyZ3MsIHRydWUpO1xuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5jb25zdCBlbCA9IGh0bWw7XG5jb25zdCBoID0gaHRtbDtcblxuaHRtbC5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmRIdG1sKC4uLmFyZ3MpIHtcbiAgcmV0dXJuIGh0bWwuYmluZCh0aGlzLCAuLi5hcmdzKTtcbn07XG5cbmZ1bmN0aW9uIHVubW91bnQocGFyZW50LCBfY2hpbGQpIHtcbiAgbGV0IGNoaWxkID0gX2NoaWxkO1xuICBjb25zdCBwYXJlbnRFbCA9IGdldEVsKHBhcmVudCk7XG4gIGNvbnN0IGNoaWxkRWwgPSBnZXRFbChjaGlsZCk7XG5cbiAgaWYgKGNoaWxkID09PSBjaGlsZEVsICYmIGNoaWxkRWwuX19yZWRvbV92aWV3KSB7XG4gICAgLy8gdHJ5IHRvIGxvb2sgdXAgdGhlIHZpZXcgaWYgbm90IHByb3ZpZGVkXG4gICAgY2hpbGQgPSBjaGlsZEVsLl9fcmVkb21fdmlldztcbiAgfVxuXG4gIGlmIChjaGlsZEVsLnBhcmVudE5vZGUpIHtcbiAgICBkb1VubW91bnQoY2hpbGQsIGNoaWxkRWwsIHBhcmVudEVsKTtcblxuICAgIHBhcmVudEVsLnJlbW92ZUNoaWxkKGNoaWxkRWwpO1xuICB9XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG5mdW5jdGlvbiBkb1VubW91bnQoY2hpbGQsIGNoaWxkRWwsIHBhcmVudEVsKSB7XG4gIGNvbnN0IGhvb2tzID0gY2hpbGRFbC5fX3JlZG9tX2xpZmVjeWNsZTtcblxuICBpZiAoaG9va3NBcmVFbXB0eShob29rcykpIHtcbiAgICBjaGlsZEVsLl9fcmVkb21fbGlmZWN5Y2xlID0ge307XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHRyYXZlcnNlID0gcGFyZW50RWw7XG5cbiAgaWYgKGNoaWxkRWwuX19yZWRvbV9tb3VudGVkKSB7XG4gICAgdHJpZ2dlcihjaGlsZEVsLCBcIm9udW5tb3VudFwiKTtcbiAgfVxuXG4gIHdoaWxlICh0cmF2ZXJzZSkge1xuICAgIGNvbnN0IHBhcmVudEhvb2tzID0gdHJhdmVyc2UuX19yZWRvbV9saWZlY3ljbGUgfHwge307XG5cbiAgICBmb3IgKGNvbnN0IGhvb2sgaW4gaG9va3MpIHtcbiAgICAgIGlmIChwYXJlbnRIb29rc1tob29rXSkge1xuICAgICAgICBwYXJlbnRIb29rc1tob29rXSAtPSBob29rc1tob29rXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaG9va3NBcmVFbXB0eShwYXJlbnRIb29rcykpIHtcbiAgICAgIHRyYXZlcnNlLl9fcmVkb21fbGlmZWN5Y2xlID0gbnVsbDtcbiAgICB9XG5cbiAgICB0cmF2ZXJzZSA9IHRyYXZlcnNlLnBhcmVudE5vZGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaG9va3NBcmVFbXB0eShob29rcykge1xuICBpZiAoaG9va3MgPT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IGluIGhvb2tzKSB7XG4gICAgaWYgKGhvb2tzW2tleV0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qIGdsb2JhbCBOb2RlLCBTaGFkb3dSb290ICovXG5cblxuY29uc3QgaG9va05hbWVzID0gW1wib25tb3VudFwiLCBcIm9ucmVtb3VudFwiLCBcIm9udW5tb3VudFwiXTtcbmNvbnN0IHNoYWRvd1Jvb3RBdmFpbGFibGUgPVxuICB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIFwiU2hhZG93Um9vdFwiIGluIHdpbmRvdztcblxuZnVuY3Rpb24gbW91bnQocGFyZW50LCBfY2hpbGQsIGJlZm9yZSwgcmVwbGFjZSkge1xuICBsZXQgY2hpbGQgPSBfY2hpbGQ7XG4gIGNvbnN0IHBhcmVudEVsID0gZ2V0RWwocGFyZW50KTtcbiAgY29uc3QgY2hpbGRFbCA9IGdldEVsKGNoaWxkKTtcblxuICBpZiAoY2hpbGQgPT09IGNoaWxkRWwgJiYgY2hpbGRFbC5fX3JlZG9tX3ZpZXcpIHtcbiAgICAvLyB0cnkgdG8gbG9vayB1cCB0aGUgdmlldyBpZiBub3QgcHJvdmlkZWRcbiAgICBjaGlsZCA9IGNoaWxkRWwuX19yZWRvbV92aWV3O1xuICB9XG5cbiAgaWYgKGNoaWxkICE9PSBjaGlsZEVsKSB7XG4gICAgY2hpbGRFbC5fX3JlZG9tX3ZpZXcgPSBjaGlsZDtcbiAgfVxuXG4gIGNvbnN0IHdhc01vdW50ZWQgPSBjaGlsZEVsLl9fcmVkb21fbW91bnRlZDtcbiAgY29uc3Qgb2xkUGFyZW50ID0gY2hpbGRFbC5wYXJlbnROb2RlO1xuXG4gIGlmICh3YXNNb3VudGVkICYmIG9sZFBhcmVudCAhPT0gcGFyZW50RWwpIHtcbiAgICBkb1VubW91bnQoY2hpbGQsIGNoaWxkRWwsIG9sZFBhcmVudCk7XG4gIH1cblxuICBpZiAoYmVmb3JlICE9IG51bGwpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgY29uc3QgYmVmb3JlRWwgPSBnZXRFbChiZWZvcmUpO1xuXG4gICAgICBpZiAoYmVmb3JlRWwuX19yZWRvbV9tb3VudGVkKSB7XG4gICAgICAgIHRyaWdnZXIoYmVmb3JlRWwsIFwib251bm1vdW50XCIpO1xuICAgICAgfVxuXG4gICAgICBwYXJlbnRFbC5yZXBsYWNlQ2hpbGQoY2hpbGRFbCwgYmVmb3JlRWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJlbnRFbC5pbnNlcnRCZWZvcmUoY2hpbGRFbCwgZ2V0RWwoYmVmb3JlKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKGNoaWxkRWwpO1xuICB9XG5cbiAgZG9Nb3VudChjaGlsZCwgY2hpbGRFbCwgcGFyZW50RWwsIG9sZFBhcmVudCk7XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG5mdW5jdGlvbiB0cmlnZ2VyKGVsLCBldmVudE5hbWUpIHtcbiAgaWYgKGV2ZW50TmFtZSA9PT0gXCJvbm1vdW50XCIgfHwgZXZlbnROYW1lID09PSBcIm9ucmVtb3VudFwiKSB7XG4gICAgZWwuX19yZWRvbV9tb3VudGVkID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChldmVudE5hbWUgPT09IFwib251bm1vdW50XCIpIHtcbiAgICBlbC5fX3JlZG9tX21vdW50ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGhvb2tzID0gZWwuX19yZWRvbV9saWZlY3ljbGU7XG5cbiAgaWYgKCFob29rcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHZpZXcgPSBlbC5fX3JlZG9tX3ZpZXc7XG4gIGxldCBob29rQ291bnQgPSAwO1xuXG4gIHZpZXc/LltldmVudE5hbWVdPy4oKTtcblxuICBmb3IgKGNvbnN0IGhvb2sgaW4gaG9va3MpIHtcbiAgICBpZiAoaG9vaykge1xuICAgICAgaG9va0NvdW50Kys7XG4gICAgfVxuICB9XG5cbiAgaWYgKGhvb2tDb3VudCkge1xuICAgIGxldCB0cmF2ZXJzZSA9IGVsLmZpcnN0Q2hpbGQ7XG5cbiAgICB3aGlsZSAodHJhdmVyc2UpIHtcbiAgICAgIGNvbnN0IG5leHQgPSB0cmF2ZXJzZS5uZXh0U2libGluZztcblxuICAgICAgdHJpZ2dlcih0cmF2ZXJzZSwgZXZlbnROYW1lKTtcblxuICAgICAgdHJhdmVyc2UgPSBuZXh0O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkb01vdW50KGNoaWxkLCBjaGlsZEVsLCBwYXJlbnRFbCwgb2xkUGFyZW50KSB7XG4gIGlmICghY2hpbGRFbC5fX3JlZG9tX2xpZmVjeWNsZSkge1xuICAgIGNoaWxkRWwuX19yZWRvbV9saWZlY3ljbGUgPSB7fTtcbiAgfVxuXG4gIGNvbnN0IGhvb2tzID0gY2hpbGRFbC5fX3JlZG9tX2xpZmVjeWNsZTtcbiAgY29uc3QgcmVtb3VudCA9IHBhcmVudEVsID09PSBvbGRQYXJlbnQ7XG4gIGxldCBob29rc0ZvdW5kID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBob29rTmFtZSBvZiBob29rTmFtZXMpIHtcbiAgICBpZiAoIXJlbW91bnQpIHtcbiAgICAgIC8vIGlmIGFscmVhZHkgbW91bnRlZCwgc2tpcCB0aGlzIHBoYXNlXG4gICAgICBpZiAoY2hpbGQgIT09IGNoaWxkRWwpIHtcbiAgICAgICAgLy8gb25seSBWaWV3cyBjYW4gaGF2ZSBsaWZlY3ljbGUgZXZlbnRzXG4gICAgICAgIGlmIChob29rTmFtZSBpbiBjaGlsZCkge1xuICAgICAgICAgIGhvb2tzW2hvb2tOYW1lXSA9IChob29rc1tob29rTmFtZV0gfHwgMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChob29rc1tob29rTmFtZV0pIHtcbiAgICAgIGhvb2tzRm91bmQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaG9va3NGb3VuZCkge1xuICAgIGNoaWxkRWwuX19yZWRvbV9saWZlY3ljbGUgPSB7fTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgdHJhdmVyc2UgPSBwYXJlbnRFbDtcbiAgbGV0IHRyaWdnZXJlZCA9IGZhbHNlO1xuXG4gIGlmIChyZW1vdW50IHx8IHRyYXZlcnNlPy5fX3JlZG9tX21vdW50ZWQpIHtcbiAgICB0cmlnZ2VyKGNoaWxkRWwsIHJlbW91bnQgPyBcIm9ucmVtb3VudFwiIDogXCJvbm1vdW50XCIpO1xuICAgIHRyaWdnZXJlZCA9IHRydWU7XG4gIH1cblxuICB3aGlsZSAodHJhdmVyc2UpIHtcbiAgICBjb25zdCBwYXJlbnQgPSB0cmF2ZXJzZS5wYXJlbnROb2RlO1xuXG4gICAgaWYgKCF0cmF2ZXJzZS5fX3JlZG9tX2xpZmVjeWNsZSkge1xuICAgICAgdHJhdmVyc2UuX19yZWRvbV9saWZlY3ljbGUgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRIb29rcyA9IHRyYXZlcnNlLl9fcmVkb21fbGlmZWN5Y2xlO1xuXG4gICAgZm9yIChjb25zdCBob29rIGluIGhvb2tzKSB7XG4gICAgICBwYXJlbnRIb29rc1tob29rXSA9IChwYXJlbnRIb29rc1tob29rXSB8fCAwKSArIGhvb2tzW2hvb2tdO1xuICAgIH1cblxuICAgIGlmICh0cmlnZ2VyZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0cmF2ZXJzZS5ub2RlVHlwZSA9PT0gTm9kZS5ET0NVTUVOVF9OT0RFIHx8XG4gICAgICAoc2hhZG93Um9vdEF2YWlsYWJsZSAmJiB0cmF2ZXJzZSBpbnN0YW5jZW9mIFNoYWRvd1Jvb3QpIHx8XG4gICAgICBwYXJlbnQ/Ll9fcmVkb21fbW91bnRlZFxuICAgICkge1xuICAgICAgdHJpZ2dlcih0cmF2ZXJzZSwgcmVtb3VudCA/IFwib25yZW1vdW50XCIgOiBcIm9ubW91bnRcIik7XG4gICAgICB0cmlnZ2VyZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0cmF2ZXJzZSA9IHBhcmVudDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRTdHlsZSh2aWV3LCBhcmcxLCBhcmcyKSB7XG4gIGNvbnN0IGVsID0gZ2V0RWwodmlldyk7XG5cbiAgaWYgKHR5cGVvZiBhcmcxID09PSBcIm9iamVjdFwiKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXJnMSkge1xuICAgICAgc2V0U3R5bGVWYWx1ZShlbCwga2V5LCBhcmcxW2tleV0pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBzZXRTdHlsZVZhbHVlKGVsLCBhcmcxLCBhcmcyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRTdHlsZVZhbHVlKGVsLCBrZXksIHZhbHVlKSB7XG4gIGVsLnN0eWxlW2tleV0gPSB2YWx1ZSA9PSBudWxsID8gXCJcIiA6IHZhbHVlO1xufVxuXG4vKiBnbG9iYWwgU1ZHRWxlbWVudCAqL1xuXG5cbmNvbnN0IHhsaW5rbnMgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIjtcblxuZnVuY3Rpb24gc2V0QXR0cih2aWV3LCBhcmcxLCBhcmcyKSB7XG4gIHNldEF0dHJJbnRlcm5hbCh2aWV3LCBhcmcxLCBhcmcyKTtcbn1cblxuZnVuY3Rpb24gc2V0QXR0ckludGVybmFsKHZpZXcsIGFyZzEsIGFyZzIsIGluaXRpYWwpIHtcbiAgY29uc3QgZWwgPSBnZXRFbCh2aWV3KTtcblxuICBjb25zdCBpc09iaiA9IHR5cGVvZiBhcmcxID09PSBcIm9iamVjdFwiO1xuXG4gIGlmIChpc09iaikge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFyZzEpIHtcbiAgICAgIHNldEF0dHJJbnRlcm5hbChlbCwga2V5LCBhcmcxW2tleV0sIGluaXRpYWwpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBpc1NWRyA9IGVsIGluc3RhbmNlb2YgU1ZHRWxlbWVudDtcbiAgICBjb25zdCBpc0Z1bmMgPSB0eXBlb2YgYXJnMiA9PT0gXCJmdW5jdGlvblwiO1xuXG4gICAgaWYgKGFyZzEgPT09IFwic3R5bGVcIiAmJiB0eXBlb2YgYXJnMiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgc2V0U3R5bGUoZWwsIGFyZzIpO1xuICAgIH0gZWxzZSBpZiAoaXNTVkcgJiYgaXNGdW5jKSB7XG4gICAgICBlbFthcmcxXSA9IGFyZzI7XG4gICAgfSBlbHNlIGlmIChhcmcxID09PSBcImRhdGFzZXRcIikge1xuICAgICAgc2V0RGF0YShlbCwgYXJnMik7XG4gICAgfSBlbHNlIGlmICghaXNTVkcgJiYgKGFyZzEgaW4gZWwgfHwgaXNGdW5jKSAmJiBhcmcxICE9PSBcImxpc3RcIikge1xuICAgICAgZWxbYXJnMV0gPSBhcmcyO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaXNTVkcgJiYgYXJnMSA9PT0gXCJ4bGlua1wiKSB7XG4gICAgICAgIHNldFhsaW5rKGVsLCBhcmcyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGluaXRpYWwgJiYgYXJnMSA9PT0gXCJjbGFzc1wiKSB7XG4gICAgICAgIHNldENsYXNzTmFtZShlbCwgYXJnMik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChhcmcyID09IG51bGwpIHtcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGFyZzEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGFyZzEsIGFyZzIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRDbGFzc05hbWUoZWwsIGFkZGl0aW9uVG9DbGFzc05hbWUpIHtcbiAgaWYgKGFkZGl0aW9uVG9DbGFzc05hbWUgPT0gbnVsbCkge1xuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShcImNsYXNzXCIpO1xuICB9IGVsc2UgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoYWRkaXRpb25Ub0NsYXNzTmFtZSk7XG4gIH0gZWxzZSBpZiAoXG4gICAgdHlwZW9mIGVsLmNsYXNzTmFtZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgIGVsLmNsYXNzTmFtZSAmJlxuICAgIGVsLmNsYXNzTmFtZS5iYXNlVmFsXG4gICkge1xuICAgIGVsLmNsYXNzTmFtZS5iYXNlVmFsID1cbiAgICAgIGAke2VsLmNsYXNzTmFtZS5iYXNlVmFsfSAke2FkZGl0aW9uVG9DbGFzc05hbWV9YC50cmltKCk7XG4gIH0gZWxzZSB7XG4gICAgZWwuY2xhc3NOYW1lID0gYCR7ZWwuY2xhc3NOYW1lfSAke2FkZGl0aW9uVG9DbGFzc05hbWV9YC50cmltKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0WGxpbmsoZWwsIGFyZzEsIGFyZzIpIHtcbiAgaWYgKHR5cGVvZiBhcmcxID09PSBcIm9iamVjdFwiKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXJnMSkge1xuICAgICAgc2V0WGxpbmsoZWwsIGtleSwgYXJnMVtrZXldKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGFyZzIgIT0gbnVsbCkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlTlMoeGxpbmtucywgYXJnMSwgYXJnMik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZU5TKHhsaW5rbnMsIGFyZzEsIGFyZzIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXREYXRhKGVsLCBhcmcxLCBhcmcyKSB7XG4gIGlmICh0eXBlb2YgYXJnMSA9PT0gXCJvYmplY3RcIikge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFyZzEpIHtcbiAgICAgIHNldERhdGEoZWwsIGtleSwgYXJnMVtrZXldKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGFyZzIgIT0gbnVsbCkge1xuICAgICAgZWwuZGF0YXNldFthcmcxXSA9IGFyZzI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBlbC5kYXRhc2V0W2FyZzFdO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0ZXh0KHN0cikge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyICE9IG51bGwgPyBzdHIgOiBcIlwiKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VBcmd1bWVudHNJbnRlcm5hbChlbGVtZW50LCBhcmdzLCBpbml0aWFsKSB7XG4gIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICBpZiAoYXJnICE9PSAwICYmICFhcmcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSB0eXBlb2YgYXJnO1xuXG4gICAgaWYgKHR5cGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgYXJnKGVsZW1lbnQpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlID09PSBcIm51bWJlclwiKSB7XG4gICAgICBlbGVtZW50LmFwcGVuZENoaWxkKHRleHQoYXJnKSk7XG4gICAgfSBlbHNlIGlmIChpc05vZGUoZ2V0RWwoYXJnKSkpIHtcbiAgICAgIG1vdW50KGVsZW1lbnQsIGFyZyk7XG4gICAgfSBlbHNlIGlmIChhcmcubGVuZ3RoKSB7XG4gICAgICBwYXJzZUFyZ3VtZW50c0ludGVybmFsKGVsZW1lbnQsIGFyZywgaW5pdGlhbCk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBzZXRBdHRySW50ZXJuYWwoZWxlbWVudCwgYXJnLCBudWxsLCBpbml0aWFsKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlRWwocGFyZW50KSB7XG4gIHJldHVybiB0eXBlb2YgcGFyZW50ID09PSBcInN0cmluZ1wiID8gaHRtbChwYXJlbnQpIDogZ2V0RWwocGFyZW50KTtcbn1cblxuZnVuY3Rpb24gZ2V0RWwocGFyZW50KSB7XG4gIHJldHVybiAoXG4gICAgKHBhcmVudC5ub2RlVHlwZSAmJiBwYXJlbnQpIHx8ICghcGFyZW50LmVsICYmIHBhcmVudCkgfHwgZ2V0RWwocGFyZW50LmVsKVxuICApO1xufVxuXG5mdW5jdGlvbiBpc05vZGUoYXJnKSB7XG4gIHJldHVybiBhcmc/Lm5vZGVUeXBlO1xufVxuXG5mdW5jdGlvbiBkaXNwYXRjaChjaGlsZCwgZGF0YSwgZXZlbnROYW1lID0gXCJyZWRvbVwiKSB7XG4gIGNvbnN0IGNoaWxkRWwgPSBnZXRFbChjaGlsZCk7XG4gIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50TmFtZSwgeyBidWJibGVzOiB0cnVlLCBkZXRhaWw6IGRhdGEgfSk7XG4gIGNoaWxkRWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cbmZ1bmN0aW9uIHNldENoaWxkcmVuKHBhcmVudCwgLi4uY2hpbGRyZW4pIHtcbiAgY29uc3QgcGFyZW50RWwgPSBnZXRFbChwYXJlbnQpO1xuICBsZXQgY3VycmVudCA9IHRyYXZlcnNlKHBhcmVudCwgY2hpbGRyZW4sIHBhcmVudEVsLmZpcnN0Q2hpbGQpO1xuXG4gIHdoaWxlIChjdXJyZW50KSB7XG4gICAgY29uc3QgbmV4dCA9IGN1cnJlbnQubmV4dFNpYmxpbmc7XG5cbiAgICB1bm1vdW50KHBhcmVudCwgY3VycmVudCk7XG5cbiAgICBjdXJyZW50ID0gbmV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmF2ZXJzZShwYXJlbnQsIGNoaWxkcmVuLCBfY3VycmVudCkge1xuICBsZXQgY3VycmVudCA9IF9jdXJyZW50O1xuXG4gIGNvbnN0IGNoaWxkRWxzID0gQXJyYXkoY2hpbGRyZW4ubGVuZ3RoKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hpbGRFbHNbaV0gPSBjaGlsZHJlbltpXSAmJiBnZXRFbChjaGlsZHJlbltpXSk7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2hpbGQgPSBjaGlsZHJlbltpXTtcblxuICAgIGlmICghY2hpbGQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkRWwgPSBjaGlsZEVsc1tpXTtcblxuICAgIGlmIChjaGlsZEVsID09PSBjdXJyZW50KSB7XG4gICAgICBjdXJyZW50ID0gY3VycmVudC5uZXh0U2libGluZztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChpc05vZGUoY2hpbGRFbCkpIHtcbiAgICAgIGNvbnN0IG5leHQgPSBjdXJyZW50Py5uZXh0U2libGluZztcbiAgICAgIGNvbnN0IGV4aXN0cyA9IGNoaWxkLl9fcmVkb21faW5kZXggIT0gbnVsbDtcbiAgICAgIGNvbnN0IHJlcGxhY2UgPSBleGlzdHMgJiYgbmV4dCA9PT0gY2hpbGRFbHNbaSArIDFdO1xuXG4gICAgICBtb3VudChwYXJlbnQsIGNoaWxkLCBjdXJyZW50LCByZXBsYWNlKTtcblxuICAgICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgY3VycmVudCA9IG5leHQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGlsZC5sZW5ndGggIT0gbnVsbCkge1xuICAgICAgY3VycmVudCA9IHRyYXZlcnNlKHBhcmVudCwgY2hpbGQsIGN1cnJlbnQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjdXJyZW50O1xufVxuXG5mdW5jdGlvbiBsaXN0UG9vbChWaWV3LCBrZXksIGluaXREYXRhKSB7XG4gIHJldHVybiBuZXcgTGlzdFBvb2woVmlldywga2V5LCBpbml0RGF0YSk7XG59XG5cbmNsYXNzIExpc3RQb29sIHtcbiAgY29uc3RydWN0b3IoVmlldywga2V5LCBpbml0RGF0YSkge1xuICAgIHRoaXMuVmlldyA9IFZpZXc7XG4gICAgdGhpcy5pbml0RGF0YSA9IGluaXREYXRhO1xuICAgIHRoaXMub2xkTG9va3VwID0ge307XG4gICAgdGhpcy5sb29rdXAgPSB7fTtcbiAgICB0aGlzLm9sZFZpZXdzID0gW107XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuXG4gICAgaWYgKGtleSAhPSBudWxsKSB7XG4gICAgICB0aGlzLmtleSA9IHR5cGVvZiBrZXkgPT09IFwiZnVuY3Rpb25cIiA/IGtleSA6IHByb3BLZXkoa2V5KTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoZGF0YSwgY29udGV4dCkge1xuICAgIGNvbnN0IHsgVmlldywga2V5LCBpbml0RGF0YSB9ID0gdGhpcztcbiAgICBjb25zdCBrZXlTZXQgPSBrZXkgIT0gbnVsbDtcblxuICAgIGNvbnN0IG9sZExvb2t1cCA9IHRoaXMubG9va3VwO1xuICAgIGNvbnN0IG5ld0xvb2t1cCA9IHt9O1xuXG4gICAgY29uc3QgbmV3Vmlld3MgPSBBcnJheShkYXRhLmxlbmd0aCk7XG4gICAgY29uc3Qgb2xkVmlld3MgPSB0aGlzLnZpZXdzO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBpdGVtID0gZGF0YVtpXTtcbiAgICAgIGxldCB2aWV3O1xuXG4gICAgICBpZiAoa2V5U2V0KSB7XG4gICAgICAgIGNvbnN0IGlkID0ga2V5KGl0ZW0pO1xuXG4gICAgICAgIHZpZXcgPSBvbGRMb29rdXBbaWRdIHx8IG5ldyBWaWV3KGluaXREYXRhLCBpdGVtLCBpLCBkYXRhKTtcbiAgICAgICAgbmV3TG9va3VwW2lkXSA9IHZpZXc7XG4gICAgICAgIHZpZXcuX19yZWRvbV9pZCA9IGlkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldyA9IG9sZFZpZXdzW2ldIHx8IG5ldyBWaWV3KGluaXREYXRhLCBpdGVtLCBpLCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIHZpZXcudXBkYXRlPy4oaXRlbSwgaSwgZGF0YSwgY29udGV4dCk7XG5cbiAgICAgIGNvbnN0IGVsID0gZ2V0RWwodmlldy5lbCk7XG5cbiAgICAgIGVsLl9fcmVkb21fdmlldyA9IHZpZXc7XG4gICAgICBuZXdWaWV3c1tpXSA9IHZpZXc7XG4gICAgfVxuXG4gICAgdGhpcy5vbGRWaWV3cyA9IG9sZFZpZXdzO1xuICAgIHRoaXMudmlld3MgPSBuZXdWaWV3cztcblxuICAgIHRoaXMub2xkTG9va3VwID0gb2xkTG9va3VwO1xuICAgIHRoaXMubG9va3VwID0gbmV3TG9va3VwO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb3BLZXkoa2V5KSB7XG4gIHJldHVybiBmdW5jdGlvbiBwcm9wcGVkS2V5KGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbVtrZXldO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsaXN0KHBhcmVudCwgVmlldywga2V5LCBpbml0RGF0YSkge1xuICByZXR1cm4gbmV3IExpc3QocGFyZW50LCBWaWV3LCBrZXksIGluaXREYXRhKTtcbn1cblxuY2xhc3MgTGlzdCB7XG4gIGNvbnN0cnVjdG9yKHBhcmVudCwgVmlldywga2V5LCBpbml0RGF0YSkge1xuICAgIHRoaXMuVmlldyA9IFZpZXc7XG4gICAgdGhpcy5pbml0RGF0YSA9IGluaXREYXRhO1xuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB0aGlzLnBvb2wgPSBuZXcgTGlzdFBvb2woVmlldywga2V5LCBpbml0RGF0YSk7XG4gICAgdGhpcy5lbCA9IGVuc3VyZUVsKHBhcmVudCk7XG4gICAgdGhpcy5rZXlTZXQgPSBrZXkgIT0gbnVsbDtcbiAgfVxuXG4gIHVwZGF0ZShkYXRhLCBjb250ZXh0KSB7XG4gICAgY29uc3QgeyBrZXlTZXQgfSA9IHRoaXM7XG4gICAgY29uc3Qgb2xkVmlld3MgPSB0aGlzLnZpZXdzO1xuXG4gICAgdGhpcy5wb29sLnVwZGF0ZShkYXRhIHx8IFtdLCBjb250ZXh0KTtcblxuICAgIGNvbnN0IHsgdmlld3MsIGxvb2t1cCB9ID0gdGhpcy5wb29sO1xuXG4gICAgaWYgKGtleVNldCkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRWaWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBvbGRWaWV3ID0gb2xkVmlld3NbaV07XG4gICAgICAgIGNvbnN0IGlkID0gb2xkVmlldy5fX3JlZG9tX2lkO1xuXG4gICAgICAgIGlmIChsb29rdXBbaWRdID09IG51bGwpIHtcbiAgICAgICAgICBvbGRWaWV3Ll9fcmVkb21faW5kZXggPSBudWxsO1xuICAgICAgICAgIHVubW91bnQodGhpcywgb2xkVmlldyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZpZXdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2aWV3ID0gdmlld3NbaV07XG5cbiAgICAgIHZpZXcuX19yZWRvbV9pbmRleCA9IGk7XG4gICAgfVxuXG4gICAgc2V0Q2hpbGRyZW4odGhpcywgdmlld3MpO1xuXG4gICAgaWYgKGtleVNldCkge1xuICAgICAgdGhpcy5sb29rdXAgPSBsb29rdXA7XG4gICAgfVxuICAgIHRoaXMudmlld3MgPSB2aWV3cztcbiAgfVxufVxuXG5MaXN0LmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZExpc3QocGFyZW50LCBWaWV3LCBrZXksIGluaXREYXRhKSB7XG4gIHJldHVybiBMaXN0LmJpbmQoTGlzdCwgcGFyZW50LCBWaWV3LCBrZXksIGluaXREYXRhKTtcbn07XG5cbmxpc3QuZXh0ZW5kID0gTGlzdC5leHRlbmQ7XG5cbi8qIGdsb2JhbCBOb2RlICovXG5cblxuZnVuY3Rpb24gcGxhY2UoVmlldywgaW5pdERhdGEpIHtcbiAgcmV0dXJuIG5ldyBQbGFjZShWaWV3LCBpbml0RGF0YSk7XG59XG5cbmNsYXNzIFBsYWNlIHtcbiAgY29uc3RydWN0b3IoVmlldywgaW5pdERhdGEpIHtcbiAgICB0aGlzLmVsID0gdGV4dChcIlwiKTtcbiAgICB0aGlzLnZpc2libGUgPSBmYWxzZTtcbiAgICB0aGlzLnZpZXcgPSBudWxsO1xuICAgIHRoaXMuX3BsYWNlaG9sZGVyID0gdGhpcy5lbDtcblxuICAgIGlmIChWaWV3IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgdGhpcy5fZWwgPSBWaWV3O1xuICAgIH0gZWxzZSBpZiAoVmlldy5lbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgIHRoaXMuX2VsID0gVmlldztcbiAgICAgIHRoaXMudmlldyA9IFZpZXc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX1ZpZXcgPSBWaWV3O1xuICAgIH1cblxuICAgIHRoaXMuX2luaXREYXRhID0gaW5pdERhdGE7XG4gIH1cblxuICB1cGRhdGUodmlzaWJsZSwgZGF0YSkge1xuICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gdGhpcy5fcGxhY2Vob2xkZXI7XG4gICAgY29uc3QgcGFyZW50Tm9kZSA9IHRoaXMuZWwucGFyZW50Tm9kZTtcblxuICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xuICAgICAgICBpZiAodGhpcy5fZWwpIHtcbiAgICAgICAgICBtb3VudChwYXJlbnROb2RlLCB0aGlzLl9lbCwgcGxhY2Vob2xkZXIpO1xuICAgICAgICAgIHVubW91bnQocGFyZW50Tm9kZSwgcGxhY2Vob2xkZXIpO1xuXG4gICAgICAgICAgdGhpcy5lbCA9IGdldEVsKHRoaXMuX2VsKTtcbiAgICAgICAgICB0aGlzLnZpc2libGUgPSB2aXNpYmxlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IFZpZXcgPSB0aGlzLl9WaWV3O1xuICAgICAgICAgIGNvbnN0IHZpZXcgPSBuZXcgVmlldyh0aGlzLl9pbml0RGF0YSk7XG5cbiAgICAgICAgICB0aGlzLmVsID0gZ2V0RWwodmlldyk7XG4gICAgICAgICAgdGhpcy52aWV3ID0gdmlldztcblxuICAgICAgICAgIG1vdW50KHBhcmVudE5vZGUsIHZpZXcsIHBsYWNlaG9sZGVyKTtcbiAgICAgICAgICB1bm1vdW50KHBhcmVudE5vZGUsIHBsYWNlaG9sZGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy52aWV3Py51cGRhdGU/LihkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMudmlzaWJsZSkge1xuICAgICAgICBpZiAodGhpcy5fZWwpIHtcbiAgICAgICAgICBtb3VudChwYXJlbnROb2RlLCBwbGFjZWhvbGRlciwgdGhpcy5fZWwpO1xuICAgICAgICAgIHVubW91bnQocGFyZW50Tm9kZSwgdGhpcy5fZWwpO1xuXG4gICAgICAgICAgdGhpcy5lbCA9IHBsYWNlaG9sZGVyO1xuICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHZpc2libGU7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW91bnQocGFyZW50Tm9kZSwgcGxhY2Vob2xkZXIsIHRoaXMudmlldyk7XG4gICAgICAgIHVubW91bnQocGFyZW50Tm9kZSwgdGhpcy52aWV3KTtcblxuICAgICAgICB0aGlzLmVsID0gcGxhY2Vob2xkZXI7XG4gICAgICAgIHRoaXMudmlldyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudmlzaWJsZSA9IHZpc2libGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVmKGN0eCwga2V5LCB2YWx1ZSkge1xuICBjdHhba2V5XSA9IHZhbHVlO1xuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qIGdsb2JhbCBOb2RlICovXG5cblxuZnVuY3Rpb24gcm91dGVyKHBhcmVudCwgdmlld3MsIGluaXREYXRhKSB7XG4gIHJldHVybiBuZXcgUm91dGVyKHBhcmVudCwgdmlld3MsIGluaXREYXRhKTtcbn1cblxuY2xhc3MgUm91dGVyIHtcbiAgY29uc3RydWN0b3IocGFyZW50LCB2aWV3cywgaW5pdERhdGEpIHtcbiAgICB0aGlzLmVsID0gZW5zdXJlRWwocGFyZW50KTtcbiAgICB0aGlzLnZpZXdzID0gdmlld3M7XG4gICAgdGhpcy5WaWV3cyA9IHZpZXdzOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICAgIHRoaXMuaW5pdERhdGEgPSBpbml0RGF0YTtcbiAgfVxuXG4gIHVwZGF0ZShyb3V0ZSwgZGF0YSkge1xuICAgIGlmIChyb3V0ZSAhPT0gdGhpcy5yb3V0ZSkge1xuICAgICAgY29uc3Qgdmlld3MgPSB0aGlzLnZpZXdzO1xuICAgICAgY29uc3QgVmlldyA9IHZpZXdzW3JvdXRlXTtcblxuICAgICAgdGhpcy5yb3V0ZSA9IHJvdXRlO1xuXG4gICAgICBpZiAoVmlldyAmJiAoVmlldyBpbnN0YW5jZW9mIE5vZGUgfHwgVmlldy5lbCBpbnN0YW5jZW9mIE5vZGUpKSB7XG4gICAgICAgIHRoaXMudmlldyA9IFZpZXc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnZpZXcgPSBWaWV3ICYmIG5ldyBWaWV3KHRoaXMuaW5pdERhdGEsIGRhdGEpO1xuICAgICAgfVxuXG4gICAgICBzZXRDaGlsZHJlbih0aGlzLmVsLCBbdGhpcy52aWV3XSk7XG4gICAgfVxuICAgIHRoaXMudmlldz8udXBkYXRlPy4oZGF0YSwgcm91dGUpO1xuICB9XG59XG5cbmNvbnN0IG5zID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xuXG5mdW5jdGlvbiBzdmcocXVlcnksIC4uLmFyZ3MpIHtcbiAgbGV0IGVsZW1lbnQ7XG5cbiAgY29uc3QgdHlwZSA9IHR5cGVvZiBxdWVyeTtcblxuICBpZiAodHlwZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KHF1ZXJ5LCBucyk7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY29uc3QgUXVlcnkgPSBxdWVyeTtcbiAgICBlbGVtZW50ID0gbmV3IFF1ZXJ5KC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkF0IGxlYXN0IG9uZSBhcmd1bWVudCByZXF1aXJlZFwiKTtcbiAgfVxuXG4gIHBhcnNlQXJndW1lbnRzSW50ZXJuYWwoZ2V0RWwoZWxlbWVudCksIGFyZ3MsIHRydWUpO1xuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5jb25zdCBzID0gc3ZnO1xuXG5zdmcuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kU3ZnKC4uLmFyZ3MpIHtcbiAgcmV0dXJuIHN2Zy5iaW5kKHRoaXMsIC4uLmFyZ3MpO1xufTtcblxuc3ZnLm5zID0gbnM7XG5cbmZ1bmN0aW9uIHZpZXdGYWN0b3J5KHZpZXdzLCBrZXkpIHtcbiAgaWYgKCF2aWV3cyB8fCB0eXBlb2Ygdmlld3MgIT09IFwib2JqZWN0XCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ2aWV3cyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgfVxuICBpZiAoIWtleSB8fCB0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwia2V5IG11c3QgYmUgYSBzdHJpbmdcIik7XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uIGZhY3RvcnlWaWV3KGluaXREYXRhLCBpdGVtLCBpLCBkYXRhKSB7XG4gICAgY29uc3Qgdmlld0tleSA9IGl0ZW1ba2V5XTtcbiAgICBjb25zdCBWaWV3ID0gdmlld3Nbdmlld0tleV07XG5cbiAgICBpZiAoVmlldykge1xuICAgICAgcmV0dXJuIG5ldyBWaWV3KGluaXREYXRhLCBpdGVtLCBpLCBkYXRhKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYHZpZXcgJHt2aWV3S2V5fSBub3QgZm91bmRgKTtcbiAgfTtcbn1cblxuZXhwb3J0IHsgTGlzdCwgTGlzdFBvb2wsIFBsYWNlLCBSb3V0ZXIsIGRpc3BhdGNoLCBlbCwgaCwgaHRtbCwgbGlzdCwgbGlzdFBvb2wsIG1vdW50LCBwbGFjZSwgcmVmLCByb3V0ZXIsIHMsIHNldEF0dHIsIHNldENoaWxkcmVuLCBzZXREYXRhLCBzZXRTdHlsZSwgc2V0WGxpbmssIHN2ZywgdGV4dCwgdW5tb3VudCwgdmlld0ZhY3RvcnkgfTtcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcblxyXG5jbGFzcyBGb3JtSGVhZGVyIHtcclxuICBjb25zdHJ1Y3Rvcihwcm9wcykge1xyXG4gICAgY29uc3Qge3RleHQsIC4uLm90aGVyUHJvcHN9ID0gcHJvcHM7XHJcblxyXG4gICAgdGhpcy5lbCA9XHJcbiAgICAgIDxoMSBjbGFzcz1cInRleHQtY2VudGVyXCIgey4uLm90aGVyUHJvcHN9Pntwcm9wcy50ZXh0fTwvaDE+XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBGb3JtSGVhZGVyO1xyXG4iLCJpbXBvcnQgeyBlbCB9IGZyb20gXCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lc1wiO1xyXG5cclxuY2xhc3MgRm9ybUlucHV0UGFzc3dvcmQge1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XHJcbiAgICBjb25zdCB7bGFiZWwsIGtleSwgLi4ub3RoZXJQcm9wc30gPSBwcm9wcztcclxuXHJcbiAgICBjb25zdCBpbnB1dElkID0gYGJhc2UtaW5wdXQtJHtrZXl9YDtcclxuICAgIHRoaXMuZWwgPSBcclxuICAgICAgPGRpdj5cclxuICAgICAgICA8bGFiZWwgZm9yPXtpbnB1dElkfSBjbGFzcz1cImZvcm0tbGFiZWxcIj57bGFiZWx9PC9sYWJlbD5cclxuICAgICAgICA8aW5wdXQgaWQ9e2lucHV0SWR9IHR5cGU9XCJwYXNzd29yZFwiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgey4uLm90aGVyUHJvcHN9Lz5cclxuICAgICAgPC9kaXY+XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBGb3JtSW5wdXRQYXNzd29yZDtcclxuIiwiaW1wb3J0IHsgZWwgfSBmcm9tIFwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3JlZG9tL2Rpc3QvcmVkb20uZXNcIjtcclxuXHJcbmNsYXNzIEZvcm1JbnB1dEVtYWlsIHtcclxuICBjb25zdHJ1Y3Rvcihwcm9wcykge1xyXG4gICAgY29uc3Qge2xhYmVsLCBrZXksIC4uLm90aGVyUHJvcHN9ID0gcHJvcHM7XHJcblxyXG4gICAgY29uc3QgaW5wdXRJZCA9IGBiYXNlLWlucHV0LSR7a2V5fWA7XHJcbiAgICB0aGlzLmVsID0gXHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGxhYmVsIGZvcj17aW5wdXRJZH0gY2xhc3M9XCJmb3JtLWxhYmVsXCI+e2xhYmVsfTwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGlkPXtpbnB1dElkfSB0eXBlPVwiZW1haWxcIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIHsuLi5vdGhlclByb3BzfSByZXF1aXJlZC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgRm9ybUlucHV0RW1haWw7XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcblxyXG5jbGFzcyBGb3JtU3dpdGNoTGFiZWwge1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XHJcbiAgICB0aGlzLmVsID0gXHJcbiAgICAgIDxwPjxzbWFsbD57YCR7cHJvcHMudGV4dH0gYH08YSBocmVmPXtwcm9wcy5saW5rfT57cHJvcHMubGlua1RleHR9PC9hPjwvc21hbGw+PC9wPlxyXG4gIH1cclxufVxyXG4gIFxyXG5leHBvcnQgZGVmYXVsdCBGb3JtU3dpdGNoTGFiZWw7XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcblxyXG5jbGFzcyBGb3JtQnV0dG9uIHtcclxuICBjb25zdHJ1Y3Rvcihwcm9wcykge1xyXG4gICAgY29uc3Qge3RleHQsIHR5cGUsIC4uLm90aGVyUHJvcHN9ID0gcHJvcHM7XHJcblxyXG4gICAgbGV0IGJvb3RzdHJhcEJ0blR5cGUgPSBcImJ0bi1saWdodFwiO1xyXG4gICAgc3dpdGNoKHR5cGUpIHtcclxuICAgICAgY2FzZSBcInN1Y2Nlc3NcIjpcclxuICAgICAgICBib290c3RyYXBCdG5UeXBlID0gXCJidG4tc3VjY2Vzc1wiO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIFwiZGFuZ2VyXCI6XHJcbiAgICAgICAgYm9vdHN0cmFwQnRuVHlwZSA9IFwiYnRuLWRhbmdlclwiO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRoaXMgaW5zdGFudGlhdGlvbiBpcyBuZWVkZWQgYmVjYXVzZVxyXG4gICAgLy8gcmVkb20gKyBiYWJlbCBmYWlscyB0byByZW5kZXIgYSBqc3ggd2l0aFxyXG4gICAgLy8gY29tcGxleCBjbGFzc05hbWUgaS5lLiA8ZGl2IGNsYXNzPVwiY2xhc3Mgb3RoZXItY2xhc3NcIi8+XHJcbiAgICBjb25zdCBidG4gPSBPYmplY3QuYXNzaWduKFxyXG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpLFxyXG4gICAgICB7XHJcbiAgICAgICAgdHlwZTogXCJidXR0b25cIixcclxuICAgICAgICBjbGFzc05hbWU6IGBidG4gJHtib290c3RyYXBCdG5UeXBlfSB3LTEwMGAsXHJcbiAgICAgICAgdGV4dENvbnRlbnQ6IHByb3BzLnRleHQsXHJcbiAgICAgICAgLi4ub3RoZXJQcm9wc1xyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuZWwgPVxyXG4gICAgICA8ZGl2IGNsYXNzPVwidGV4dC1jZW50ZXJcIj5cclxuICAgICAgICB7YnRufVxyXG4gICAgICA8L2Rpdj5cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IEZvcm1CdXR0b247XHJcbiIsImltcG9ydCB7IG1vdW50LCBlbCB9IGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lc1wiO1xyXG5pbXBvcnQgRm9ybUhlYWRlciBmcm9tIFwiLi4vY29tcG9uZW50cy9mb3Jtcy9Gb3JtSGVhZGVyLmpzeFwiO1xyXG5pbXBvcnQgRm9ybUlucHV0UGFzc3dvcmQgZnJvbSBcIi4uL2NvbXBvbmVudHMvZm9ybXMvRm9ybUlucHV0UGFzc3dvcmQuanN4XCI7XHJcbmltcG9ydCBGb3JtSW5wdXRFbWFpbCBmcm9tIFwiLi4vY29tcG9uZW50cy9mb3Jtcy9Gb3JtSW5wdXRFbWFpbC5qc3hcIjtcclxuaW1wb3J0IEZvcm1Td2l0Y2hMYWJlbCBmcm9tIFwiLi4vY29tcG9uZW50cy9mb3Jtcy9Gb3JtU3dpdGNoTGFiZWwuanN4XCI7XHJcbmltcG9ydCBGb3JtQnV0dG9uIGZyb20gXCIuLi9jb21wb25lbnRzL2Zvcm1zL0Zvcm1CdXR0b24uanN4XCI7XHJcblxyXG5jb25zdCBSZWdpc3RlciA9XHJcbiAgPGRpdiBjbGFzcz1cImNvbnRhaW5lci1tZFwiPlxyXG4gICAgPGRpdiBjbGFzcz1cIm1iLTNcIj5cclxuICAgICAgPEZvcm1IZWFkZXIgdGV4dD1cItCg0LXQs9C40YHRgtGA0LDRhtC40Y9cIi8+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJtYi0zXCI+XHJcbiAgICAgIDxGb3JtSW5wdXRFbWFpbCBsYWJlbD1cIkUtbWFpbFwiIHBsYWNlaG9sZGVyPVwiKkAqLipcIiBrZXk9XCJlbWFpbFwiLz5cclxuICAgIDwvZGl2PlxyXG4gICAgPGRpdiBjbGFzcz1cIm1iLTNcIj5cclxuICAgICAgPEZvcm1JbnB1dFBhc3N3b3JkIGxhYmVsPVwi0J/QsNGA0L7Qu9GMXCIgcGxhY2Vob2xkZXI9XCIqXCIga2V5PVwicHdkXCIvPlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibWItNFwiPlxyXG4gICAgICA8Rm9ybUlucHV0UGFzc3dvcmQgbGFiZWw9XCLQn9C+0LLRgtC+0YDQuNGC0LUg0L/QsNGA0L7Qu9GMXCIgcGxhY2Vob2xkZXI9XCIqXCIga2V5PVwicHdkLXJlcGVhdFwiLz5cclxuICAgICAgPEZvcm1Td2l0Y2hMYWJlbCB0ZXh0PVwi0KPQttC1INC10YHRgtGMINCw0LrQutCw0YPQvdGCP1wiIGxpbmtUZXh0PVwi0JLQvtC50YLQuFwiIGxpbms9XCIuL2xvZ2luLmh0bWxcIi8+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxGb3JtQnV0dG9uIHRleHQ9XCLQl9Cw0YDQtdCz0LjRgdGC0YDQuNGA0L7QstCw0YLRjNGB0Y9cIiB0eXBlPVwic3VjY2Vzc1wiLz5cclxuICA8L2Rpdj47XHJcblxyXG5tb3VudChcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpblwiKSxcclxuICAgIFJlZ2lzdGVyXHJcbik7XHJcbiJdLCJuYW1lcyI6WyJjcmVhdGVFbGVtZW50IiwicXVlcnkiLCJucyIsInRhZyIsImlkIiwiY2xhc3NOYW1lIiwicGFyc2UiLCJlbGVtZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50TlMiLCJjaHVua3MiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJ0cmltIiwiaHRtbCIsImFyZ3MiLCJ0eXBlIiwiUXVlcnkiLCJFcnJvciIsInBhcnNlQXJndW1lbnRzSW50ZXJuYWwiLCJnZXRFbCIsImVsIiwiZXh0ZW5kIiwiZXh0ZW5kSHRtbCIsImJpbmQiLCJkb1VubW91bnQiLCJjaGlsZCIsImNoaWxkRWwiLCJwYXJlbnRFbCIsImhvb2tzIiwiX19yZWRvbV9saWZlY3ljbGUiLCJob29rc0FyZUVtcHR5IiwidHJhdmVyc2UiLCJfX3JlZG9tX21vdW50ZWQiLCJ0cmlnZ2VyIiwicGFyZW50SG9va3MiLCJob29rIiwicGFyZW50Tm9kZSIsImtleSIsImhvb2tOYW1lcyIsInNoYWRvd1Jvb3RBdmFpbGFibGUiLCJ3aW5kb3ciLCJtb3VudCIsInBhcmVudCIsIl9jaGlsZCIsImJlZm9yZSIsInJlcGxhY2UiLCJfX3JlZG9tX3ZpZXciLCJ3YXNNb3VudGVkIiwib2xkUGFyZW50IiwiYXBwZW5kQ2hpbGQiLCJkb01vdW50IiwiZXZlbnROYW1lIiwidmlldyIsImhvb2tDb3VudCIsImZpcnN0Q2hpbGQiLCJuZXh0IiwibmV4dFNpYmxpbmciLCJyZW1vdW50IiwiaG9va3NGb3VuZCIsImhvb2tOYW1lIiwidHJpZ2dlcmVkIiwibm9kZVR5cGUiLCJOb2RlIiwiRE9DVU1FTlRfTk9ERSIsIlNoYWRvd1Jvb3QiLCJzZXRTdHlsZSIsImFyZzEiLCJhcmcyIiwic2V0U3R5bGVWYWx1ZSIsInZhbHVlIiwic3R5bGUiLCJ4bGlua25zIiwic2V0QXR0ckludGVybmFsIiwiaW5pdGlhbCIsImlzT2JqIiwiaXNTVkciLCJTVkdFbGVtZW50IiwiaXNGdW5jIiwic2V0RGF0YSIsInNldFhsaW5rIiwic2V0Q2xhc3NOYW1lIiwicmVtb3ZlQXR0cmlidXRlIiwic2V0QXR0cmlidXRlIiwiYWRkaXRpb25Ub0NsYXNzTmFtZSIsImNsYXNzTGlzdCIsImFkZCIsImJhc2VWYWwiLCJzZXRBdHRyaWJ1dGVOUyIsInJlbW92ZUF0dHJpYnV0ZU5TIiwiZGF0YXNldCIsInRleHQiLCJzdHIiLCJjcmVhdGVUZXh0Tm9kZSIsImFyZyIsImlzTm9kZSIsIkZvcm1IZWFkZXIiLCJfY3JlYXRlQ2xhc3MiLCJwcm9wcyIsIl9jbGFzc0NhbGxDaGVjayIsIm90aGVyUHJvcHMiLCJfb2JqZWN0V2l0aG91dFByb3BlcnRpZXMiLCJfZXhjbHVkZWQiLCJfZXh0ZW5kcyIsIkZvcm1JbnB1dFBhc3N3b3JkIiwibGFiZWwiLCJpbnB1dElkIiwiY29uY2F0IiwiRm9ybUlucHV0RW1haWwiLCJyZXF1aXJlZCIsIkZvcm1Td2l0Y2hMYWJlbCIsImhyZWYiLCJsaW5rIiwibGlua1RleHQiLCJGb3JtQnV0dG9uIiwiYm9vdHN0cmFwQnRuVHlwZSIsImJ0biIsIk9iamVjdCIsImFzc2lnbiIsIl9vYmplY3RTcHJlYWQiLCJ0ZXh0Q29udGVudCIsIlJlZ2lzdGVyIiwicGxhY2Vob2xkZXIiLCJnZXRFbGVtZW50QnlJZCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxTQUFTQSxhQUFhQSxDQUFDQyxLQUFLLEVBQUVDLEVBQUUsRUFBRTtFQUNoQyxNQUFNO0lBQUVDLEdBQUc7SUFBRUMsRUFBRTtBQUFFQyxJQUFBQTtBQUFVLEdBQUMsR0FBR0MsS0FBSyxDQUFDTCxLQUFLLENBQUM7QUFDM0MsRUFBQSxNQUFNTSxPQUFPLEdBQUdMLEVBQUUsR0FDZE0sUUFBUSxDQUFDQyxlQUFlLENBQUNQLEVBQUUsRUFBRUMsR0FBRyxDQUFDLEdBQ2pDSyxRQUFRLENBQUNSLGFBQWEsQ0FBQ0csR0FBRyxDQUFDO0FBRS9CLEVBQUEsSUFBSUMsRUFBRSxFQUFFO0lBQ05HLE9BQU8s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
