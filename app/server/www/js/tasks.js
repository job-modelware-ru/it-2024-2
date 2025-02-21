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
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
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

var Header = /*#__PURE__*/_createClass(function Header(props) {
  _classCallCheck(this, Header);
  this.el = el("div", {
    "class": "header"
  }, el("h1", null, "\u0421\u043F\u0438\u0441\u043E\u043A \u0434\u0435\u043B"), el("button", {
    type: "button",
    "class": "btn"
  }, "\u0412\u044B\u0445\u043E\u0434"));
});

function mountWithHeader(root, element) {
  var appDiv = Object.assign(document.createElement("div"), {
    className: "container centered"
  });
  appDiv.appendChild(element);
  mount(root, el("div", {
    "class": "app-body"
  }, new Header({}), appDiv));
}

var _excluded$1 = ["text"];
var FormHeader = /*#__PURE__*/_createClass(function FormHeader(props) {
  _classCallCheck(this, FormHeader);
  props.text;
    var otherProps = _objectWithoutProperties(props, _excluded$1);
  this.el = el("h1", _extends({
    "class": "text-center"
  }, otherProps), props.text);
});

var _excluded = ["label", "key"];
var FormCheckbox = /*#__PURE__*/_createClass(function FormCheckbox(props) {
  _classCallCheck(this, FormCheckbox);
  var label = props.label,
    key = props.key,
    otherProps = _objectWithoutProperties(props, _excluded);
  var checkboxId = "checkbox-".concat(key);
  this.el = el("div", {
    "class": "form-check"
  }, el("input", _extends({
    "class": "form-check-input",
    type: "checkbox",
    id: checkboxId
  }, otherProps)), el("label", {
    "class": "form-check-label",
    "for": checkboxId
  }, label));
});

var Icon = /*#__PURE__*/_createClass(function Icon(props) {
  _classCallCheck(this, Icon);
  this.el = el("img", {
    src: "./icons/".concat(props.src),
    style: "width:".concat(props.w, "px;height:").concat(props.h, "px;")
  });
});

var TaskIconButton = /*#__PURE__*/_createClass(function TaskIconButton(props) {
  _classCallCheck(this, TaskIconButton);
  // This instantiation is needed because
  // redom + babel fails to render a jsx with
  // complex className i.e. <div class="class other-class"/>
  var btn = Object.assign(document.createElement("button"), {
    type: "button",
    className: "btn task-icon-button"
  });
  var icon = new Icon({
    src: props.src,
    w: props.w,
    h: props.h
  });
  btn.appendChild(icon.el);
  this.el = btn;
});

var TaskControlButtons = /*#__PURE__*/_createClass(function TaskControlButtons(props) {
  _classCallCheck(this, TaskControlButtons);
  this.el = el("div", {
    "class": "task-control-buttons-container"
  }, new TaskIconButton({
    src: "ic-pencil-16x16.svg",
    w: 16,
    h: 16
  }), new TaskIconButton({
    src: "ic-trash-16x16.svg",
    w: 16,
    h: 16
  }));
});

var TaskDeadline = /*#__PURE__*/_createClass(function TaskDeadline(props) {
  _classCallCheck(this, TaskDeadline);
  this.el = el("div", {
    "class": "task-deadline-container"
  }, new Icon({
    src: "ic-calendar-16x16.svg",
    w: 16,
    h: 16
  }), el("small", null, props.date));
});

var Task = /*#__PURE__*/_createClass(function Task(props) {
  _classCallCheck(this, Task);
  this.el = el("div", {
    "class": "task-container"
  }, el("div", {
    "class": "task-checkbox-container"
  }, new FormCheckbox({
    label: props.name,
    key: props.key
  })), new TaskDeadline({
    date: props.deadline
  }), new TaskControlButtons({}));
});

var TaskNewButton = /*#__PURE__*/_createClass(function TaskNewButton(props) {
  _classCallCheck(this, TaskNewButton);
  var btn = Object.assign(document.createElement("button"), {
    type: "button",
    className: "btn btn-outline-primary",
    textContent: "Новая задача"
  });
  this.el = btn;
});

var testTasksData = [{
  name: "Задача...",
  deadline: "11.11.1111"
}];
var Tasks = el("div", null, el("div", {
  "class": "mb-3"
}, new FormHeader({
  text: "Список задач"
})), el("div", {
  "class": "tasks-list-container"
}, testTasksData.map(function (taskData, index) {
  return new Task({
    name: taskData.name,
    deadline: taskData.deadline,
    key: "task-".concat(index)
  });
}), new TaskNewButton({})));
mountWithHeader(document.getElementById("root"), Tasks);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2NsaWVudC9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lcy5qcyIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy9IZWFkZXIuanN4IiwiLi4vLi4vLi4vY2xpZW50L3NyYy91dGlscy9Nb3VudFdpdGhIZWFkZXIuanMiLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvZm9ybXMvRm9ybUhlYWRlci5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvZm9ybXMvRm9ybUNoZWNrYm94LmpzeCIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy9JY29uLmpzeCIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy90YXNrL1Rhc2tJY29uQnV0dG9uLmpzeCIsIi4uLy4uLy4uL2NsaWVudC9zcmMvY29tcG9uZW50cy90YXNrL1Rhc2tDb250cm9sQnV0dG9ucy5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvdGFzay9UYXNrRGVhZGxpbmUuanN4IiwiLi4vLi4vLi4vY2xpZW50L3NyYy9jb21wb25lbnRzL3Rhc2svVGFzay5qc3giLCIuLi8uLi8uLi9jbGllbnQvc3JjL2NvbXBvbmVudHMvdGFzay9UYXNrTmV3QnV0dG9uLmpzeCIsIi4uLy4uLy4uL2NsaWVudC9zcmMvcGFnZXMvdGFza3MuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gY3JlYXRlRWxlbWVudChxdWVyeSwgbnMpIHtcbiAgY29uc3QgeyB0YWcsIGlkLCBjbGFzc05hbWUgfSA9IHBhcnNlKHF1ZXJ5KTtcbiAgY29uc3QgZWxlbWVudCA9IG5zXG4gICAgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcblxuICBpZiAoaWQpIHtcbiAgICBlbGVtZW50LmlkID0gaWQ7XG4gIH1cblxuICBpZiAoY2xhc3NOYW1lKSB7XG4gICAgaWYgKG5zKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5mdW5jdGlvbiBwYXJzZShxdWVyeSkge1xuICBjb25zdCBjaHVua3MgPSBxdWVyeS5zcGxpdCgvKFsuI10pLyk7XG4gIGxldCBjbGFzc05hbWUgPSBcIlwiO1xuICBsZXQgaWQgPSBcIlwiO1xuXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgY2h1bmtzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgc3dpdGNoIChjaHVua3NbaV0pIHtcbiAgICAgIGNhc2UgXCIuXCI6XG4gICAgICAgIGNsYXNzTmFtZSArPSBgICR7Y2h1bmtzW2kgKyAxXX1gO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIiNcIjpcbiAgICAgICAgaWQgPSBjaHVua3NbaSArIDFdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY2xhc3NOYW1lOiBjbGFzc05hbWUudHJpbSgpLFxuICAgIHRhZzogY2h1bmtzWzBdIHx8IFwiZGl2XCIsXG4gICAgaWQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWwocXVlcnksIC4uLmFyZ3MpIHtcbiAgbGV0IGVsZW1lbnQ7XG5cbiAgY29uc3QgdHlwZSA9IHR5cGVvZiBxdWVyeTtcblxuICBpZiAodHlwZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KHF1ZXJ5KTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBjb25zdCBRdWVyeSA9IHF1ZXJ5O1xuICAgIGVsZW1lbnQgPSBuZXcgUXVlcnkoLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXQgbGVhc3Qgb25lIGFyZ3VtZW50IHJlcXVpcmVkXCIpO1xuICB9XG5cbiAgcGFyc2VBcmd1bWVudHNJbnRlcm5hbChnZXRFbChlbGVtZW50KSwgYXJncywgdHJ1ZSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmNvbnN0IGVsID0gaHRtbDtcbmNvbnN0IGggPSBodG1sO1xuXG5odG1sLmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZEh0bWwoLi4uYXJncykge1xuICByZXR1cm4gaHRtbC5iaW5kKHRoaXMsIC4uLmFyZ3MpO1xufTtcblxuZnVuY3Rpb24gdW5tb3VudChwYXJlbnQsIF9jaGlsZCkge1xuICBsZXQgY2hpbGQgPSBfY2hpbGQ7XG4gIGNvbnN0IHBhcmVudEVsID0gZ2V0RWwocGFyZW50KTtcbiAgY29uc3QgY2hpbGRFbCA9IGdldEVsKGNoaWxkKTtcblxuICBpZiAoY2hpbGQgPT09IGNoaWxkRWwgJiYgY2hpbGRFbC5fX3JlZG9tX3ZpZXcpIHtcbiAgICAvLyB0cnkgdG8gbG9vayB1cCB0aGUgdmlldyBpZiBub3QgcHJvdmlkZWRcbiAgICBjaGlsZCA9IGNoaWxkRWwuX19yZWRvbV92aWV3O1xuICB9XG5cbiAgaWYgKGNoaWxkRWwucGFyZW50Tm9kZSkge1xuICAgIGRvVW5tb3VudChjaGlsZCwgY2hpbGRFbCwgcGFyZW50RWwpO1xuXG4gICAgcGFyZW50RWwucmVtb3ZlQ2hpbGQoY2hpbGRFbCk7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIGRvVW5tb3VudChjaGlsZCwgY2hpbGRFbCwgcGFyZW50RWwpIHtcbiAgY29uc3QgaG9va3MgPSBjaGlsZEVsLl9fcmVkb21fbGlmZWN5Y2xlO1xuXG4gIGlmIChob29rc0FyZUVtcHR5KGhvb2tzKSkge1xuICAgIGNoaWxkRWwuX19yZWRvbV9saWZlY3ljbGUgPSB7fTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgdHJhdmVyc2UgPSBwYXJlbnRFbDtcblxuICBpZiAoY2hpbGRFbC5fX3JlZG9tX21vdW50ZWQpIHtcbiAgICB0cmlnZ2VyKGNoaWxkRWwsIFwib251bm1vdW50XCIpO1xuICB9XG5cbiAgd2hpbGUgKHRyYXZlcnNlKSB7XG4gICAgY29uc3QgcGFyZW50SG9va3MgPSB0cmF2ZXJzZS5fX3JlZG9tX2xpZmVjeWNsZSB8fCB7fTtcblxuICAgIGZvciAoY29uc3QgaG9vayBpbiBob29rcykge1xuICAgICAgaWYgKHBhcmVudEhvb2tzW2hvb2tdKSB7XG4gICAgICAgIHBhcmVudEhvb2tzW2hvb2tdIC09IGhvb2tzW2hvb2tdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChob29rc0FyZUVtcHR5KHBhcmVudEhvb2tzKSkge1xuICAgICAgdHJhdmVyc2UuX19yZWRvbV9saWZlY3ljbGUgPSBudWxsO1xuICAgIH1cblxuICAgIHRyYXZlcnNlID0gdHJhdmVyc2UucGFyZW50Tm9kZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBob29rc0FyZUVtcHR5KGhvb2tzKSB7XG4gIGlmIChob29rcyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgaW4gaG9va3MpIHtcbiAgICBpZiAoaG9va3Nba2V5XSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyogZ2xvYmFsIE5vZGUsIFNoYWRvd1Jvb3QgKi9cblxuXG5jb25zdCBob29rTmFtZXMgPSBbXCJvbm1vdW50XCIsIFwib25yZW1vdW50XCIsIFwib251bm1vdW50XCJdO1xuY29uc3Qgc2hhZG93Um9vdEF2YWlsYWJsZSA9XG4gIHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgXCJTaGFkb3dSb290XCIgaW4gd2luZG93O1xuXG5mdW5jdGlvbiBtb3VudChwYXJlbnQsIF9jaGlsZCwgYmVmb3JlLCByZXBsYWNlKSB7XG4gIGxldCBjaGlsZCA9IF9jaGlsZDtcbiAgY29uc3QgcGFyZW50RWwgPSBnZXRFbChwYXJlbnQpO1xuICBjb25zdCBjaGlsZEVsID0gZ2V0RWwoY2hpbGQpO1xuXG4gIGlmIChjaGlsZCA9PT0gY2hpbGRFbCAmJiBjaGlsZEVsLl9fcmVkb21fdmlldykge1xuICAgIC8vIHRyeSB0byBsb29rIHVwIHRoZSB2aWV3IGlmIG5vdCBwcm92aWRlZFxuICAgIGNoaWxkID0gY2hpbGRFbC5fX3JlZG9tX3ZpZXc7XG4gIH1cblxuICBpZiAoY2hpbGQgIT09IGNoaWxkRWwpIHtcbiAgICBjaGlsZEVsLl9fcmVkb21fdmlldyA9IGNoaWxkO1xuICB9XG5cbiAgY29uc3Qgd2FzTW91bnRlZCA9IGNoaWxkRWwuX19yZWRvbV9tb3VudGVkO1xuICBjb25zdCBvbGRQYXJlbnQgPSBjaGlsZEVsLnBhcmVudE5vZGU7XG5cbiAgaWYgKHdhc01vdW50ZWQgJiYgb2xkUGFyZW50ICE9PSBwYXJlbnRFbCkge1xuICAgIGRvVW5tb3VudChjaGlsZCwgY2hpbGRFbCwgb2xkUGFyZW50KTtcbiAgfVxuXG4gIGlmIChiZWZvcmUgIT0gbnVsbCkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICBjb25zdCBiZWZvcmVFbCA9IGdldEVsKGJlZm9yZSk7XG5cbiAgICAgIGlmIChiZWZvcmVFbC5fX3JlZG9tX21vdW50ZWQpIHtcbiAgICAgICAgdHJpZ2dlcihiZWZvcmVFbCwgXCJvbnVubW91bnRcIik7XG4gICAgICB9XG5cbiAgICAgIHBhcmVudEVsLnJlcGxhY2VDaGlsZChjaGlsZEVsLCBiZWZvcmVFbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudEVsLmluc2VydEJlZm9yZShjaGlsZEVsLCBnZXRFbChiZWZvcmUpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQoY2hpbGRFbCk7XG4gIH1cblxuICBkb01vdW50KGNoaWxkLCBjaGlsZEVsLCBwYXJlbnRFbCwgb2xkUGFyZW50KTtcblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbmZ1bmN0aW9uIHRyaWdnZXIoZWwsIGV2ZW50TmFtZSkge1xuICBpZiAoZXZlbnROYW1lID09PSBcIm9ubW91bnRcIiB8fCBldmVudE5hbWUgPT09IFwib25yZW1vdW50XCIpIHtcbiAgICBlbC5fX3JlZG9tX21vdW50ZWQgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGV2ZW50TmFtZSA9PT0gXCJvbnVubW91bnRcIikge1xuICAgIGVsLl9fcmVkb21fbW91bnRlZCA9IGZhbHNlO1xuICB9XG5cbiAgY29uc3QgaG9va3MgPSBlbC5fX3JlZG9tX2xpZmVjeWNsZTtcblxuICBpZiAoIWhvb2tzKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdmlldyA9IGVsLl9fcmVkb21fdmlldztcbiAgbGV0IGhvb2tDb3VudCA9IDA7XG5cbiAgdmlldz8uW2V2ZW50TmFtZV0/LigpO1xuXG4gIGZvciAoY29uc3QgaG9vayBpbiBob29rcykge1xuICAgIGlmIChob29rKSB7XG4gICAgICBob29rQ291bnQrKztcbiAgICB9XG4gIH1cblxuICBpZiAoaG9va0NvdW50KSB7XG4gICAgbGV0IHRyYXZlcnNlID0gZWwuZmlyc3RDaGlsZDtcblxuICAgIHdoaWxlICh0cmF2ZXJzZSkge1xuICAgICAgY29uc3QgbmV4dCA9IHRyYXZlcnNlLm5leHRTaWJsaW5nO1xuXG4gICAgICB0cmlnZ2VyKHRyYXZlcnNlLCBldmVudE5hbWUpO1xuXG4gICAgICB0cmF2ZXJzZSA9IG5leHQ7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGRvTW91bnQoY2hpbGQsIGNoaWxkRWwsIHBhcmVudEVsLCBvbGRQYXJlbnQpIHtcbiAgaWYgKCFjaGlsZEVsLl9fcmVkb21fbGlmZWN5Y2xlKSB7XG4gICAgY2hpbGRFbC5fX3JlZG9tX2xpZmVjeWNsZSA9IHt9O1xuICB9XG5cbiAgY29uc3QgaG9va3MgPSBjaGlsZEVsLl9fcmVkb21fbGlmZWN5Y2xlO1xuICBjb25zdCByZW1vdW50ID0gcGFyZW50RWwgPT09IG9sZFBhcmVudDtcbiAgbGV0IGhvb2tzRm91bmQgPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IGhvb2tOYW1lIG9mIGhvb2tOYW1lcykge1xuICAgIGlmICghcmVtb3VudCkge1xuICAgICAgLy8gaWYgYWxyZWFkeSBtb3VudGVkLCBza2lwIHRoaXMgcGhhc2VcbiAgICAgIGlmIChjaGlsZCAhPT0gY2hpbGRFbCkge1xuICAgICAgICAvLyBvbmx5IFZpZXdzIGNhbiBoYXZlIGxpZmVjeWNsZSBldmVudHNcbiAgICAgICAgaWYgKGhvb2tOYW1lIGluIGNoaWxkKSB7XG4gICAgICAgICAgaG9va3NbaG9va05hbWVdID0gKGhvb2tzW2hvb2tOYW1lXSB8fCAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGhvb2tzW2hvb2tOYW1lXSkge1xuICAgICAgaG9va3NGb3VuZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFob29rc0ZvdW5kKSB7XG4gICAgY2hpbGRFbC5fX3JlZG9tX2xpZmVjeWNsZSA9IHt9O1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCB0cmF2ZXJzZSA9IHBhcmVudEVsO1xuICBsZXQgdHJpZ2dlcmVkID0gZmFsc2U7XG5cbiAgaWYgKHJlbW91bnQgfHwgdHJhdmVyc2U/Ll9fcmVkb21fbW91bnRlZCkge1xuICAgIHRyaWdnZXIoY2hpbGRFbCwgcmVtb3VudCA/IFwib25yZW1vdW50XCIgOiBcIm9ubW91bnRcIik7XG4gICAgdHJpZ2dlcmVkID0gdHJ1ZTtcbiAgfVxuXG4gIHdoaWxlICh0cmF2ZXJzZSkge1xuICAgIGNvbnN0IHBhcmVudCA9IHRyYXZlcnNlLnBhcmVudE5vZGU7XG5cbiAgICBpZiAoIXRyYXZlcnNlLl9fcmVkb21fbGlmZWN5Y2xlKSB7XG4gICAgICB0cmF2ZXJzZS5fX3JlZG9tX2xpZmVjeWNsZSA9IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmVudEhvb2tzID0gdHJhdmVyc2UuX19yZWRvbV9saWZlY3ljbGU7XG5cbiAgICBmb3IgKGNvbnN0IGhvb2sgaW4gaG9va3MpIHtcbiAgICAgIHBhcmVudEhvb2tzW2hvb2tdID0gKHBhcmVudEhvb2tzW2hvb2tdIHx8IDApICsgaG9va3NbaG9va107XG4gICAgfVxuXG4gICAgaWYgKHRyaWdnZXJlZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIHRyYXZlcnNlLm5vZGVUeXBlID09PSBOb2RlLkRPQ1VNRU5UX05PREUgfHxcbiAgICAgIChzaGFkb3dSb290QXZhaWxhYmxlICYmIHRyYXZlcnNlIGluc3RhbmNlb2YgU2hhZG93Um9vdCkgfHxcbiAgICAgIHBhcmVudD8uX19yZWRvbV9tb3VudGVkXG4gICAgKSB7XG4gICAgICB0cmlnZ2VyKHRyYXZlcnNlLCByZW1vdW50ID8gXCJvbnJlbW91bnRcIiA6IFwib25tb3VudFwiKTtcbiAgICAgIHRyaWdnZXJlZCA9IHRydWU7XG4gICAgfVxuICAgIHRyYXZlcnNlID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFN0eWxlKHZpZXcsIGFyZzEsIGFyZzIpIHtcbiAgY29uc3QgZWwgPSBnZXRFbCh2aWV3KTtcblxuICBpZiAodHlwZW9mIGFyZzEgPT09IFwib2JqZWN0XCIpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhcmcxKSB7XG4gICAgICBzZXRTdHlsZVZhbHVlKGVsLCBrZXksIGFyZzFba2V5XSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHNldFN0eWxlVmFsdWUoZWwsIGFyZzEsIGFyZzIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFN0eWxlVmFsdWUoZWwsIGtleSwgdmFsdWUpIHtcbiAgZWwuc3R5bGVba2V5XSA9IHZhbHVlID09IG51bGwgPyBcIlwiIDogdmFsdWU7XG59XG5cbi8qIGdsb2JhbCBTVkdFbGVtZW50ICovXG5cblxuY29uc3QgeGxpbmtucyA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiO1xuXG5mdW5jdGlvbiBzZXRBdHRyKHZpZXcsIGFyZzEsIGFyZzIpIHtcbiAgc2V0QXR0ckludGVybmFsKHZpZXcsIGFyZzEsIGFyZzIpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRySW50ZXJuYWwodmlldywgYXJnMSwgYXJnMiwgaW5pdGlhbCkge1xuICBjb25zdCBlbCA9IGdldEVsKHZpZXcpO1xuXG4gIGNvbnN0IGlzT2JqID0gdHlwZW9mIGFyZzEgPT09IFwib2JqZWN0XCI7XG5cbiAgaWYgKGlzT2JqKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXJnMSkge1xuICAgICAgc2V0QXR0ckludGVybmFsKGVsLCBrZXksIGFyZzFba2V5XSwgaW5pdGlhbCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGlzU1ZHID0gZWwgaW5zdGFuY2VvZiBTVkdFbGVtZW50O1xuICAgIGNvbnN0IGlzRnVuYyA9IHR5cGVvZiBhcmcyID09PSBcImZ1bmN0aW9uXCI7XG5cbiAgICBpZiAoYXJnMSA9PT0gXCJzdHlsZVwiICYmIHR5cGVvZiBhcmcyID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBzZXRTdHlsZShlbCwgYXJnMik7XG4gICAgfSBlbHNlIGlmIChpc1NWRyAmJiBpc0Z1bmMpIHtcbiAgICAgIGVsW2FyZzFdID0gYXJnMjtcbiAgICB9IGVsc2UgaWYgKGFyZzEgPT09IFwiZGF0YXNldFwiKSB7XG4gICAgICBzZXREYXRhKGVsLCBhcmcyKTtcbiAgICB9IGVsc2UgaWYgKCFpc1NWRyAmJiAoYXJnMSBpbiBlbCB8fCBpc0Z1bmMpICYmIGFyZzEgIT09IFwibGlzdFwiKSB7XG4gICAgICBlbFthcmcxXSA9IGFyZzI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpc1NWRyAmJiBhcmcxID09PSBcInhsaW5rXCIpIHtcbiAgICAgICAgc2V0WGxpbmsoZWwsIGFyZzIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaW5pdGlhbCAmJiBhcmcxID09PSBcImNsYXNzXCIpIHtcbiAgICAgICAgc2V0Q2xhc3NOYW1lKGVsLCBhcmcyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGFyZzIgPT0gbnVsbCkge1xuICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXJnMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoYXJnMSwgYXJnMik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldENsYXNzTmFtZShlbCwgYWRkaXRpb25Ub0NsYXNzTmFtZSkge1xuICBpZiAoYWRkaXRpb25Ub0NsYXNzTmFtZSA9PSBudWxsKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiY2xhc3NcIik7XG4gIH0gZWxzZSBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgZWwuY2xhc3NMaXN0LmFkZChhZGRpdGlvblRvQ2xhc3NOYW1lKTtcbiAgfSBlbHNlIGlmIChcbiAgICB0eXBlb2YgZWwuY2xhc3NOYW1lID09PSBcIm9iamVjdFwiICYmXG4gICAgZWwuY2xhc3NOYW1lICYmXG4gICAgZWwuY2xhc3NOYW1lLmJhc2VWYWxcbiAgKSB7XG4gICAgZWwuY2xhc3NOYW1lLmJhc2VWYWwgPVxuICAgICAgYCR7ZWwuY2xhc3NOYW1lLmJhc2VWYWx9ICR7YWRkaXRpb25Ub0NsYXNzTmFtZX1gLnRyaW0oKTtcbiAgfSBlbHNlIHtcbiAgICBlbC5jbGFzc05hbWUgPSBgJHtlbC5jbGFzc05hbWV9ICR7YWRkaXRpb25Ub0NsYXNzTmFtZX1gLnRyaW0oKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRYbGluayhlbCwgYXJnMSwgYXJnMikge1xuICBpZiAodHlwZW9mIGFyZzEgPT09IFwib2JqZWN0XCIpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhcmcxKSB7XG4gICAgICBzZXRYbGluayhlbCwga2V5LCBhcmcxW2tleV0pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYXJnMiAhPSBudWxsKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGVOUyh4bGlua25zLCBhcmcxLCBhcmcyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlTlMoeGxpbmtucywgYXJnMSwgYXJnMik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldERhdGEoZWwsIGFyZzEsIGFyZzIpIHtcbiAgaWYgKHR5cGVvZiBhcmcxID09PSBcIm9iamVjdFwiKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXJnMSkge1xuICAgICAgc2V0RGF0YShlbCwga2V5LCBhcmcxW2tleV0pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYXJnMiAhPSBudWxsKSB7XG4gICAgICBlbC5kYXRhc2V0W2FyZzFdID0gYXJnMjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGVsLmRhdGFzZXRbYXJnMV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRleHQoc3RyKSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHIgIT0gbnVsbCA/IHN0ciA6IFwiXCIpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUFyZ3VtZW50c0ludGVybmFsKGVsZW1lbnQsIGFyZ3MsIGluaXRpYWwpIHtcbiAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgIGlmIChhcmcgIT09IDAgJiYgIWFyZykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZSA9IHR5cGVvZiBhcmc7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBhcmcoZWxlbWVudCk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcInN0cmluZ1wiIHx8IHR5cGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQodGV4dChhcmcpKTtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZShnZXRFbChhcmcpKSkge1xuICAgICAgbW91bnQoZWxlbWVudCwgYXJnKTtcbiAgICB9IGVsc2UgaWYgKGFyZy5sZW5ndGgpIHtcbiAgICAgIHBhcnNlQXJndW1lbnRzSW50ZXJuYWwoZWxlbWVudCwgYXJnLCBpbml0aWFsKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHNldEF0dHJJbnRlcm5hbChlbGVtZW50LCBhcmcsIG51bGwsIGluaXRpYWwpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVFbChwYXJlbnQpIHtcbiAgcmV0dXJuIHR5cGVvZiBwYXJlbnQgPT09IFwic3RyaW5nXCIgPyBodG1sKHBhcmVudCkgOiBnZXRFbChwYXJlbnQpO1xufVxuXG5mdW5jdGlvbiBnZXRFbChwYXJlbnQpIHtcbiAgcmV0dXJuIChcbiAgICAocGFyZW50Lm5vZGVUeXBlICYmIHBhcmVudCkgfHwgKCFwYXJlbnQuZWwgJiYgcGFyZW50KSB8fCBnZXRFbChwYXJlbnQuZWwpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzTm9kZShhcmcpIHtcbiAgcmV0dXJuIGFyZz8ubm9kZVR5cGU7XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoKGNoaWxkLCBkYXRhLCBldmVudE5hbWUgPSBcInJlZG9tXCIpIHtcbiAgY29uc3QgY2hpbGRFbCA9IGdldEVsKGNoaWxkKTtcbiAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoZXZlbnROYW1lLCB7IGJ1YmJsZXM6IHRydWUsIGRldGFpbDogZGF0YSB9KTtcbiAgY2hpbGRFbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gc2V0Q2hpbGRyZW4ocGFyZW50LCAuLi5jaGlsZHJlbikge1xuICBjb25zdCBwYXJlbnRFbCA9IGdldEVsKHBhcmVudCk7XG4gIGxldCBjdXJyZW50ID0gdHJhdmVyc2UocGFyZW50LCBjaGlsZHJlbiwgcGFyZW50RWwuZmlyc3RDaGlsZCk7XG5cbiAgd2hpbGUgKGN1cnJlbnQpIHtcbiAgICBjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0U2libGluZztcblxuICAgIHVubW91bnQocGFyZW50LCBjdXJyZW50KTtcblxuICAgIGN1cnJlbnQgPSBuZXh0O1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyYXZlcnNlKHBhcmVudCwgY2hpbGRyZW4sIF9jdXJyZW50KSB7XG4gIGxldCBjdXJyZW50ID0gX2N1cnJlbnQ7XG5cbiAgY29uc3QgY2hpbGRFbHMgPSBBcnJheShjaGlsZHJlbi5sZW5ndGgpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjaGlsZEVsc1tpXSA9IGNoaWxkcmVuW2ldICYmIGdldEVsKGNoaWxkcmVuW2ldKTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuXG4gICAgaWYgKCFjaGlsZCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY2hpbGRFbCA9IGNoaWxkRWxzW2ldO1xuXG4gICAgaWYgKGNoaWxkRWwgPT09IGN1cnJlbnQpIHtcbiAgICAgIGN1cnJlbnQgPSBjdXJyZW50Lm5leHRTaWJsaW5nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGlzTm9kZShjaGlsZEVsKSkge1xuICAgICAgY29uc3QgbmV4dCA9IGN1cnJlbnQ/Lm5leHRTaWJsaW5nO1xuICAgICAgY29uc3QgZXhpc3RzID0gY2hpbGQuX19yZWRvbV9pbmRleCAhPSBudWxsO1xuICAgICAgY29uc3QgcmVwbGFjZSA9IGV4aXN0cyAmJiBuZXh0ID09PSBjaGlsZEVsc1tpICsgMV07XG5cbiAgICAgIG1vdW50KHBhcmVudCwgY2hpbGQsIGN1cnJlbnQsIHJlcGxhY2UpO1xuXG4gICAgICBpZiAocmVwbGFjZSkge1xuICAgICAgICBjdXJyZW50ID0gbmV4dDtcbiAgICAgIH1cblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkLmxlbmd0aCAhPSBudWxsKSB7XG4gICAgICBjdXJyZW50ID0gdHJhdmVyc2UocGFyZW50LCBjaGlsZCwgY3VycmVudCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGN1cnJlbnQ7XG59XG5cbmZ1bmN0aW9uIGxpc3RQb29sKFZpZXcsIGtleSwgaW5pdERhdGEpIHtcbiAgcmV0dXJuIG5ldyBMaXN0UG9vbChWaWV3LCBrZXksIGluaXREYXRhKTtcbn1cblxuY2xhc3MgTGlzdFBvb2wge1xuICBjb25zdHJ1Y3RvcihWaWV3LCBrZXksIGluaXREYXRhKSB7XG4gICAgdGhpcy5WaWV3ID0gVmlldztcbiAgICB0aGlzLmluaXREYXRhID0gaW5pdERhdGE7XG4gICAgdGhpcy5vbGRMb29rdXAgPSB7fTtcbiAgICB0aGlzLmxvb2t1cCA9IHt9O1xuICAgIHRoaXMub2xkVmlld3MgPSBbXTtcbiAgICB0aGlzLnZpZXdzID0gW107XG5cbiAgICBpZiAoa2V5ICE9IG51bGwpIHtcbiAgICAgIHRoaXMua2V5ID0gdHlwZW9mIGtleSA9PT0gXCJmdW5jdGlvblwiID8ga2V5IDogcHJvcEtleShrZXkpO1xuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZShkYXRhLCBjb250ZXh0KSB7XG4gICAgY29uc3QgeyBWaWV3LCBrZXksIGluaXREYXRhIH0gPSB0aGlzO1xuICAgIGNvbnN0IGtleVNldCA9IGtleSAhPSBudWxsO1xuXG4gICAgY29uc3Qgb2xkTG9va3VwID0gdGhpcy5sb29rdXA7XG4gICAgY29uc3QgbmV3TG9va3VwID0ge307XG5cbiAgICBjb25zdCBuZXdWaWV3cyA9IEFycmF5KGRhdGEubGVuZ3RoKTtcbiAgICBjb25zdCBvbGRWaWV3cyA9IHRoaXMudmlld3M7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBkYXRhW2ldO1xuICAgICAgbGV0IHZpZXc7XG5cbiAgICAgIGlmIChrZXlTZXQpIHtcbiAgICAgICAgY29uc3QgaWQgPSBrZXkoaXRlbSk7XG5cbiAgICAgICAgdmlldyA9IG9sZExvb2t1cFtpZF0gfHwgbmV3IFZpZXcoaW5pdERhdGEsIGl0ZW0sIGksIGRhdGEpO1xuICAgICAgICBuZXdMb29rdXBbaWRdID0gdmlldztcbiAgICAgICAgdmlldy5fX3JlZG9tX2lkID0gaWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3ID0gb2xkVmlld3NbaV0gfHwgbmV3IFZpZXcoaW5pdERhdGEsIGl0ZW0sIGksIGRhdGEpO1xuICAgICAgfVxuICAgICAgdmlldy51cGRhdGU/LihpdGVtLCBpLCBkYXRhLCBjb250ZXh0KTtcblxuICAgICAgY29uc3QgZWwgPSBnZXRFbCh2aWV3LmVsKTtcblxuICAgICAgZWwuX19yZWRvbV92aWV3ID0gdmlldztcbiAgICAgIG5ld1ZpZXdzW2ldID0gdmlldztcbiAgICB9XG5cbiAgICB0aGlzLm9sZFZpZXdzID0gb2xkVmlld3M7XG4gICAgdGhpcy52aWV3cyA9IG5ld1ZpZXdzO1xuXG4gICAgdGhpcy5vbGRMb29rdXAgPSBvbGRMb29rdXA7XG4gICAgdGhpcy5sb29rdXAgPSBuZXdMb29rdXA7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvcEtleShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHByb3BwZWRLZXkoaXRlbSkge1xuICAgIHJldHVybiBpdGVtW2tleV07XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxpc3QocGFyZW50LCBWaWV3LCBrZXksIGluaXREYXRhKSB7XG4gIHJldHVybiBuZXcgTGlzdChwYXJlbnQsIFZpZXcsIGtleSwgaW5pdERhdGEpO1xufVxuXG5jbGFzcyBMaXN0IHtcbiAgY29uc3RydWN0b3IocGFyZW50LCBWaWV3LCBrZXksIGluaXREYXRhKSB7XG4gICAgdGhpcy5WaWV3ID0gVmlldztcbiAgICB0aGlzLmluaXREYXRhID0gaW5pdERhdGE7XG4gICAgdGhpcy52aWV3cyA9IFtdO1xuICAgIHRoaXMucG9vbCA9IG5ldyBMaXN0UG9vbChWaWV3LCBrZXksIGluaXREYXRhKTtcbiAgICB0aGlzLmVsID0gZW5zdXJlRWwocGFyZW50KTtcbiAgICB0aGlzLmtleVNldCA9IGtleSAhPSBudWxsO1xuICB9XG5cbiAgdXBkYXRlKGRhdGEsIGNvbnRleHQpIHtcbiAgICBjb25zdCB7IGtleVNldCB9ID0gdGhpcztcbiAgICBjb25zdCBvbGRWaWV3cyA9IHRoaXMudmlld3M7XG5cbiAgICB0aGlzLnBvb2wudXBkYXRlKGRhdGEgfHwgW10sIGNvbnRleHQpO1xuXG4gICAgY29uc3QgeyB2aWV3cywgbG9va3VwIH0gPSB0aGlzLnBvb2w7XG5cbiAgICBpZiAoa2V5U2V0KSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZFZpZXdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9sZFZpZXcgPSBvbGRWaWV3c1tpXTtcbiAgICAgICAgY29uc3QgaWQgPSBvbGRWaWV3Ll9fcmVkb21faWQ7XG5cbiAgICAgICAgaWYgKGxvb2t1cFtpZF0gPT0gbnVsbCkge1xuICAgICAgICAgIG9sZFZpZXcuX19yZWRvbV9pbmRleCA9IG51bGw7XG4gICAgICAgICAgdW5tb3VudCh0aGlzLCBvbGRWaWV3KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmlld3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHZpZXcgPSB2aWV3c1tpXTtcblxuICAgICAgdmlldy5fX3JlZG9tX2luZGV4ID0gaTtcbiAgICB9XG5cbiAgICBzZXRDaGlsZHJlbih0aGlzLCB2aWV3cyk7XG5cbiAgICBpZiAoa2V5U2V0KSB7XG4gICAgICB0aGlzLmxvb2t1cCA9IGxvb2t1cDtcbiAgICB9XG4gICAgdGhpcy52aWV3cyA9IHZpZXdzO1xuICB9XG59XG5cbkxpc3QuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kTGlzdChwYXJlbnQsIFZpZXcsIGtleSwgaW5pdERhdGEpIHtcbiAgcmV0dXJuIExpc3QuYmluZChMaXN0LCBwYXJlbnQsIFZpZXcsIGtleSwgaW5pdERhdGEpO1xufTtcblxubGlzdC5leHRlbmQgPSBMaXN0LmV4dGVuZDtcblxuLyogZ2xvYmFsIE5vZGUgKi9cblxuXG5mdW5jdGlvbiBwbGFjZShWaWV3LCBpbml0RGF0YSkge1xuICByZXR1cm4gbmV3IFBsYWNlKFZpZXcsIGluaXREYXRhKTtcbn1cblxuY2xhc3MgUGxhY2Uge1xuICBjb25zdHJ1Y3RvcihWaWV3LCBpbml0RGF0YSkge1xuICAgIHRoaXMuZWwgPSB0ZXh0KFwiXCIpO1xuICAgIHRoaXMudmlzaWJsZSA9IGZhbHNlO1xuICAgIHRoaXMudmlldyA9IG51bGw7XG4gICAgdGhpcy5fcGxhY2Vob2xkZXIgPSB0aGlzLmVsO1xuXG4gICAgaWYgKFZpZXcgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICB0aGlzLl9lbCA9IFZpZXc7XG4gICAgfSBlbHNlIGlmIChWaWV3LmVsIGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgdGhpcy5fZWwgPSBWaWV3O1xuICAgICAgdGhpcy52aWV3ID0gVmlldztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fVmlldyA9IFZpZXc7XG4gICAgfVxuXG4gICAgdGhpcy5faW5pdERhdGEgPSBpbml0RGF0YTtcbiAgfVxuXG4gIHVwZGF0ZSh2aXNpYmxlLCBkYXRhKSB7XG4gICAgY29uc3QgcGxhY2Vob2xkZXIgPSB0aGlzLl9wbGFjZWhvbGRlcjtcbiAgICBjb25zdCBwYXJlbnROb2RlID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuXG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIGlmICghdGhpcy52aXNpYmxlKSB7XG4gICAgICAgIGlmICh0aGlzLl9lbCkge1xuICAgICAgICAgIG1vdW50KHBhcmVudE5vZGUsIHRoaXMuX2VsLCBwbGFjZWhvbGRlcik7XG4gICAgICAgICAgdW5tb3VudChwYXJlbnROb2RlLCBwbGFjZWhvbGRlcik7XG5cbiAgICAgICAgICB0aGlzLmVsID0gZ2V0RWwodGhpcy5fZWwpO1xuICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHZpc2libGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgVmlldyA9IHRoaXMuX1ZpZXc7XG4gICAgICAgICAgY29uc3QgdmlldyA9IG5ldyBWaWV3KHRoaXMuX2luaXREYXRhKTtcblxuICAgICAgICAgIHRoaXMuZWwgPSBnZXRFbCh2aWV3KTtcbiAgICAgICAgICB0aGlzLnZpZXcgPSB2aWV3O1xuXG4gICAgICAgICAgbW91bnQocGFyZW50Tm9kZSwgdmlldywgcGxhY2Vob2xkZXIpO1xuICAgICAgICAgIHVubW91bnQocGFyZW50Tm9kZSwgcGxhY2Vob2xkZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnZpZXc/LnVwZGF0ZT8uKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy52aXNpYmxlKSB7XG4gICAgICAgIGlmICh0aGlzLl9lbCkge1xuICAgICAgICAgIG1vdW50KHBhcmVudE5vZGUsIHBsYWNlaG9sZGVyLCB0aGlzLl9lbCk7XG4gICAgICAgICAgdW5tb3VudChwYXJlbnROb2RlLCB0aGlzLl9lbCk7XG5cbiAgICAgICAgICB0aGlzLmVsID0gcGxhY2Vob2xkZXI7XG4gICAgICAgICAgdGhpcy52aXNpYmxlID0gdmlzaWJsZTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb3VudChwYXJlbnROb2RlLCBwbGFjZWhvbGRlciwgdGhpcy52aWV3KTtcbiAgICAgICAgdW5tb3VudChwYXJlbnROb2RlLCB0aGlzLnZpZXcpO1xuXG4gICAgICAgIHRoaXMuZWwgPSBwbGFjZWhvbGRlcjtcbiAgICAgICAgdGhpcy52aWV3ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy52aXNpYmxlID0gdmlzaWJsZTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWYoY3R4LCBrZXksIHZhbHVlKSB7XG4gIGN0eFtrZXldID0gdmFsdWU7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyogZ2xvYmFsIE5vZGUgKi9cblxuXG5mdW5jdGlvbiByb3V0ZXIocGFyZW50LCB2aWV3cywgaW5pdERhdGEpIHtcbiAgcmV0dXJuIG5ldyBSb3V0ZXIocGFyZW50LCB2aWV3cywgaW5pdERhdGEpO1xufVxuXG5jbGFzcyBSb3V0ZXIge1xuICBjb25zdHJ1Y3RvcihwYXJlbnQsIHZpZXdzLCBpbml0RGF0YSkge1xuICAgIHRoaXMuZWwgPSBlbnN1cmVFbChwYXJlbnQpO1xuICAgIHRoaXMudmlld3MgPSB2aWV3cztcbiAgICB0aGlzLlZpZXdzID0gdmlld3M7IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4gICAgdGhpcy5pbml0RGF0YSA9IGluaXREYXRhO1xuICB9XG5cbiAgdXBkYXRlKHJvdXRlLCBkYXRhKSB7XG4gICAgaWYgKHJvdXRlICE9PSB0aGlzLnJvdXRlKSB7XG4gICAgICBjb25zdCB2aWV3cyA9IHRoaXMudmlld3M7XG4gICAgICBjb25zdCBWaWV3ID0gdmlld3Nbcm91dGVdO1xuXG4gICAgICB0aGlzLnJvdXRlID0gcm91dGU7XG5cbiAgICAgIGlmIChWaWV3ICYmIChWaWV3IGluc3RhbmNlb2YgTm9kZSB8fCBWaWV3LmVsIGluc3RhbmNlb2YgTm9kZSkpIHtcbiAgICAgICAgdGhpcy52aWV3ID0gVmlldztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudmlldyA9IFZpZXcgJiYgbmV3IFZpZXcodGhpcy5pbml0RGF0YSwgZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIHNldENoaWxkcmVuKHRoaXMuZWwsIFt0aGlzLnZpZXddKTtcbiAgICB9XG4gICAgdGhpcy52aWV3Py51cGRhdGU/LihkYXRhLCByb3V0ZSk7XG4gIH1cbn1cblxuY29uc3QgbnMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG5cbmZ1bmN0aW9uIHN2ZyhxdWVyeSwgLi4uYXJncykge1xuICBsZXQgZWxlbWVudDtcblxuICBjb25zdCB0eXBlID0gdHlwZW9mIHF1ZXJ5O1xuXG4gIGlmICh0eXBlID09PSBcInN0cmluZ1wiKSB7XG4gICAgZWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQocXVlcnksIG5zKTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBjb25zdCBRdWVyeSA9IHF1ZXJ5O1xuICAgIGVsZW1lbnQgPSBuZXcgUXVlcnkoLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXQgbGVhc3Qgb25lIGFyZ3VtZW50IHJlcXVpcmVkXCIpO1xuICB9XG5cbiAgcGFyc2VBcmd1bWVudHNJbnRlcm5hbChnZXRFbChlbGVtZW50KSwgYXJncywgdHJ1ZSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmNvbnN0IHMgPSBzdmc7XG5cbnN2Zy5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmRTdmcoLi4uYXJncykge1xuICByZXR1cm4gc3ZnLmJpbmQodGhpcywgLi4uYXJncyk7XG59O1xuXG5zdmcubnMgPSBucztcblxuZnVuY3Rpb24gdmlld0ZhY3Rvcnkodmlld3MsIGtleSkge1xuICBpZiAoIXZpZXdzIHx8IHR5cGVvZiB2aWV3cyAhPT0gXCJvYmplY3RcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcInZpZXdzIG11c3QgYmUgYW4gb2JqZWN0XCIpO1xuICB9XG4gIGlmICgha2V5IHx8IHR5cGVvZiBrZXkgIT09IFwic3RyaW5nXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJrZXkgbXVzdCBiZSBhIHN0cmluZ1wiKTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gZmFjdG9yeVZpZXcoaW5pdERhdGEsIGl0ZW0sIGksIGRhdGEpIHtcbiAgICBjb25zdCB2aWV3S2V5ID0gaXRlbVtrZXldO1xuICAgIGNvbnN0IFZpZXcgPSB2aWV3c1t2aWV3S2V5XTtcblxuICAgIGlmIChWaWV3KSB7XG4gICAgICByZXR1cm4gbmV3IFZpZXcoaW5pdERhdGEsIGl0ZW0sIGksIGRhdGEpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgdmlldyAke3ZpZXdLZXl9IG5vdCBmb3VuZGApO1xuICB9O1xufVxuXG5leHBvcnQgeyBMaXN0LCBMaXN0UG9vbCwgUGxhY2UsIFJvdXRlciwgZGlzcGF0Y2gsIGVsLCBoLCBodG1sLCBsaXN0LCBsaXN0UG9vbCwgbW91bnQsIHBsYWNlLCByZWYsIHJvdXRlciwgcywgc2V0QXR0ciwgc2V0Q2hpbGRyZW4sIHNldERhdGEsIHNldFN0eWxlLCBzZXRYbGluaywgc3ZnLCB0ZXh0LCB1bm1vdW50LCB2aWV3RmFjdG9yeSB9O1xuIiwiaW1wb3J0IHsgZWwgfSBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL3JlZG9tL2Rpc3QvcmVkb20uZXNcIjtcclxuXHJcbmNsYXNzIEhlYWRlciB7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgIHRoaXMuZWwgPVxyXG4gICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XHJcbiAgICAgICAgPGgxPtCh0L/QuNGB0L7QuiDQtNC10Ls8L2gxPlxyXG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuXCI+0JLRi9GF0L7QtDwvYnV0dG9uPlxyXG4gICAgICA8L2Rpdj5cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IEhlYWRlcjtcclxuIiwiaW1wb3J0IHsgbW91bnQsIGVsIH0gZnJvbSBcIi4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcbmltcG9ydCBIZWFkZXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvSGVhZGVyLmpzeFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbW91bnRXaXRoSGVhZGVyKHJvb3QsIGVsZW1lbnQpIHtcclxuICBjb25zdCBhcHBEaXYgPSBPYmplY3QuYXNzaWduKFxyXG4gICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSxcclxuICAgIHtcclxuICAgICAgY2xhc3NOYW1lOiBcImNvbnRhaW5lciBjZW50ZXJlZFwiXHJcbiAgICB9XHJcbiAgKVxyXG4gIGFwcERpdi5hcHBlbmRDaGlsZChlbGVtZW50KTtcclxuXHJcbiAgbW91bnQoXHJcbiAgICByb290LFxyXG4gICAgPGRpdiBjbGFzcz1cImFwcC1ib2R5XCI+XHJcbiAgICAgIDxIZWFkZXIgLz5cclxuICAgICAge2FwcERpdn1cclxuICAgIDwvZGl2PlxyXG4gIClcclxufTtcclxuIiwiaW1wb3J0IHsgZWwgfSBmcm9tIFwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3JlZG9tL2Rpc3QvcmVkb20uZXNcIjtcclxuXHJcbmNsYXNzIEZvcm1IZWFkZXIge1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XHJcbiAgICBjb25zdCB7dGV4dCwgLi4ub3RoZXJQcm9wc30gPSBwcm9wcztcclxuXHJcbiAgICB0aGlzLmVsID1cclxuICAgICAgPGgxIGNsYXNzPVwidGV4dC1jZW50ZXJcIiB7Li4ub3RoZXJQcm9wc30+e3Byb3BzLnRleHR9PC9oMT5cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IEZvcm1IZWFkZXI7XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcblxyXG5jbGFzcyBGb3JtQ2hlY2tib3gge1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XHJcbiAgICBjb25zdCB7bGFiZWwsIGtleSwgLi4ub3RoZXJQcm9wc30gPSBwcm9wcztcclxuXHJcbiAgICBjb25zdCBjaGVja2JveElkID0gYGNoZWNrYm94LSR7a2V5fWA7XHJcbiAgICB0aGlzLmVsID0gXHJcbiAgICAgIDxkaXYgY2xhc3M9XCJmb3JtLWNoZWNrXCI+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwiZm9ybS1jaGVjay1pbnB1dFwiIHR5cGU9XCJjaGVja2JveFwiIGlkPXtjaGVja2JveElkfSB7Li4ub3RoZXJQcm9wc30gLz5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJmb3JtLWNoZWNrLWxhYmVsXCIgZm9yPXtjaGVja2JveElkfT5cclxuICAgICAgICAgIHtsYWJlbH1cclxuICAgICAgICA8L2xhYmVsPlxyXG4gICAgICA8L2Rpdj5cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IEZvcm1DaGVja2JveDtcclxuIiwiaW1wb3J0IHsgZWwgfSBmcm9tIFwiLi4vLi4vbm9kZV9tb2R1bGVzL3JlZG9tL2Rpc3QvcmVkb20uZXNcIjtcclxuXHJcbmNsYXNzIEljb24ge1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKSB7XHJcbiAgICB0aGlzLmVsID1cclxuICAgICAgPGltZyBzcmM9e2AuL2ljb25zLyR7cHJvcHMuc3JjfWB9IHN0eWxlPXtgd2lkdGg6JHtwcm9wcy53fXB4O2hlaWdodDoke3Byb3BzLmh9cHg7YH0vPlxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgSWNvbjtcclxuIiwiaW1wb3J0IHsgZWwgfSBmcm9tIFwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3JlZG9tL2Rpc3QvcmVkb20uZXMuanNcIjtcclxuaW1wb3J0IEljb24gZnJvbSBcIi4uL0ljb24uanN4XCI7XHJcblxyXG5jbGFzcyBUYXNrSWNvbkJ1dHRvbiB7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgIC8vIFRoaXMgaW5zdGFudGlhdGlvbiBpcyBuZWVkZWQgYmVjYXVzZVxyXG4gICAgLy8gcmVkb20gKyBiYWJlbCBmYWlscyB0byByZW5kZXIgYSBqc3ggd2l0aFxyXG4gICAgLy8gY29tcGxleCBjbGFzc05hbWUgaS5lLiA8ZGl2IGNsYXNzPVwiY2xhc3Mgb3RoZXItY2xhc3NcIi8+XHJcbiAgICBjb25zdCBidG4gPSBPYmplY3QuYXNzaWduKFxyXG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpLFxyXG4gICAgICB7XHJcbiAgICAgICAgdHlwZTogXCJidXR0b25cIixcclxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuIHRhc2staWNvbi1idXR0b25cIixcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBpY29uID0gPEljb24gc3JjPXtwcm9wcy5zcmN9IHc9e3Byb3BzLnd9IGg9e3Byb3BzLmh9Lz5cclxuICAgIGJ0bi5hcHBlbmRDaGlsZChpY29uLmVsKTtcclxuXHJcbiAgICB0aGlzLmVsID0gYnRuO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgVGFza0ljb25CdXR0b247XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcbmltcG9ydCBUYXNrSWNvbkJ1dHRvbiBmcm9tIFwiLi9UYXNrSWNvbkJ1dHRvbi5qc3hcIjtcclxuXHJcbmNsYXNzIFRhc2tDb250cm9sQnV0dG9ucyB7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgIHRoaXMuZWwgPVxyXG4gICAgICA8ZGl2IGNsYXNzPVwidGFzay1jb250cm9sLWJ1dHRvbnMtY29udGFpbmVyXCI+XHJcbiAgICAgICAgPFRhc2tJY29uQnV0dG9uIHNyYz1cImljLXBlbmNpbC0xNngxNi5zdmdcIiB3PXsxNn0gaD17MTZ9Lz5cclxuICAgICAgICA8VGFza0ljb25CdXR0b24gc3JjPVwiaWMtdHJhc2gtMTZ4MTYuc3ZnXCIgdz17MTZ9IGg9ezE2fS8+XHJcbiAgICAgIDwvZGl2PlxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgVGFza0NvbnRyb2xCdXR0b25zO1xyXG4iLCJpbXBvcnQgeyBlbCB9IGZyb20gXCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lc1wiO1xyXG5pbXBvcnQgSWNvbiBmcm9tIFwiLi4vSWNvbi5qc3hcIjtcclxuXHJcbmNsYXNzIFRhc2tEZWFkbGluZSB7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgIHRoaXMuZWwgPVxyXG4gICAgICA8ZGl2IGNsYXNzPVwidGFzay1kZWFkbGluZS1jb250YWluZXJcIj5cclxuICAgICAgICA8SWNvbiBzcmM9XCJpYy1jYWxlbmRhci0xNngxNi5zdmdcIiB3PXsxNn0gaD17MTZ9Lz5cclxuICAgICAgICA8c21hbGw+e3Byb3BzLmRhdGV9PC9zbWFsbD5cclxuICAgICAgPC9kaXY+XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBUYXNrRGVhZGxpbmU7XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzXCI7XHJcbmltcG9ydCBGb3JtQ2hlY2tib3ggZnJvbSBcIi4uL2Zvcm1zL0Zvcm1DaGVja2JveC5qc3hcIjtcclxuaW1wb3J0IFRhc2tDb250cm9sQnV0dG9ucyBmcm9tIFwiLi9UYXNrQ29udHJvbEJ1dHRvbnMuanN4XCI7XHJcbmltcG9ydCBUYXNrRGVhZGxpbmUgZnJvbSBcIi4vVGFza0RlYWRsaW5lLmpzeFwiO1xyXG5cclxuY2xhc3MgVGFzayB7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgIHRoaXMuZWwgPVxyXG4gICAgICA8ZGl2IGNsYXNzPVwidGFzay1jb250YWluZXJcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwidGFzay1jaGVja2JveC1jb250YWluZXJcIj5cclxuICAgICAgICAgIDxGb3JtQ2hlY2tib3ggbGFiZWw9e3Byb3BzLm5hbWV9IGtleT17cHJvcHMua2V5fS8+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPFRhc2tEZWFkbGluZSBkYXRlPXtwcm9wcy5kZWFkbGluZX0vPlxyXG4gICAgICAgIDxUYXNrQ29udHJvbEJ1dHRvbnMvPlxyXG4gICAgICA8L2Rpdj5cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IFRhc2s7XHJcbiIsImltcG9ydCB7IGVsIH0gZnJvbSBcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZWRvbS9kaXN0L3JlZG9tLmVzLmpzXCI7XHJcblxyXG5jbGFzcyBUYXNrTmV3QnV0dG9uIHtcclxuICBjb25zdHJ1Y3Rvcihwcm9wcykge1xyXG4gICAgY29uc3QgYnRuID0gT2JqZWN0LmFzc2lnbihcclxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKSxcclxuICAgICAge1xyXG4gICAgICAgIHR5cGU6IFwiYnV0dG9uXCIsXHJcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0biBidG4tb3V0bGluZS1wcmltYXJ5XCIsXHJcbiAgICAgICAgdGV4dENvbnRlbnQ6IFwi0J3QvtCy0LDRjyDQt9Cw0LTQsNGH0LBcIlxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuZWwgPSBidG47XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBUYXNrTmV3QnV0dG9uO1xyXG4iLCJpbXBvcnQgeyBlbCB9IGZyb20gXCIuLi8uLi9ub2RlX21vZHVsZXMvcmVkb20vZGlzdC9yZWRvbS5lc1wiO1xyXG5pbXBvcnQgbW91bnRXaXRoSGVhZGVyIGZyb20gXCIuLi91dGlscy9Nb3VudFdpdGhIZWFkZXIuanNcIjtcclxuaW1wb3J0IEZvcm1IZWFkZXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvZm9ybXMvRm9ybUhlYWRlci5qc3hcIjtcclxuaW1wb3J0IFRhc2sgZnJvbSBcIi4uL2NvbXBvbmVudHMvdGFzay9UYXNrLmpzeFwiO1xyXG5pbXBvcnQgVGFza05ld0J1dHRvbiBmcm9tIFwiLi4vY29tcG9uZW50cy90YXNrL1Rhc2tOZXdCdXR0b24uanN4XCI7XHJcblxyXG5jb25zdCB0ZXN0VGFza3NEYXRhID0gW1xyXG4gIHtcclxuICAgIG5hbWU6IFwi0JfQsNC00LDRh9CwLi4uXCIsXHJcbiAgICBkZWFkbGluZTogXCIxMS4xMS4xMTExXCJcclxuICB9LFxyXG5dXHJcblxyXG5jb25zdCBUYXNrcyA9XHJcbiAgPGRpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJtYi0zXCI+XHJcbiAgICAgIDxGb3JtSGVhZGVyIHRleHQ9XCLQodC/0LjRgdC+0Log0LfQsNC00LDRh1wiLz5cclxuICAgIDwvZGl2PlxyXG4gICAgPGRpdiBjbGFzcz1cInRhc2tzLWxpc3QtY29udGFpbmVyXCI+XHJcbiAgICAgIHt0ZXN0VGFza3NEYXRhLm1hcCgodGFza0RhdGEsIGluZGV4KSA9PiBcclxuICAgICAgICA8VGFzayBuYW1lPXt0YXNrRGF0YS5uYW1lfSBkZWFkbGluZT17dGFza0RhdGEuZGVhZGxpbmV9IGtleT17YHRhc2stJHtpbmRleH1gfS8+XHJcbiAgICAgICl9XHJcbiAgICAgIDxUYXNrTmV3QnV0dG9uLz5cclxuICAgIDwvZGl2PlxyXG4gIDwvZGl2PjtcclxuXHJcbm1vdW50V2l0aEhlYWRlcihcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vdFwiKSxcclxuICAgIFRhc2tzXHJcbik7XHJcbiAgIl0sIm5hbWVzIjpbImNyZWF0ZUVsZW1lbnQiLCJxdWVyeSIsIm5zIiwidGFnIiwiaWQiLCJjbGFzc05hbWUiLCJwYXJzZSIsImVsZW1lbnQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnROUyIsImNodW5rcyIsInNwbGl0IiwiaSIsImxlbmd0aCIsInRyaW0iLCJodG1sIiwiYXJncyIsInR5cGUiLCJRdWVyeSIsIkVycm9yIiwicGFyc2VBcmd1bWVudHNJbnRlcm5hbCIsImdldEVsIiwiZWwiLCJleHRlbmQiLCJleHRlbmRIdG1sIiwiYmluZCIsImRvVW5tb3VudCIsImNoaWxkIiwiY2hpbGRFbCIsInBhcmVudEVsIiwiaG9va3MiLCJfX3JlZG9tX2xpZmVjeWNsZSIsImhvb2tzQXJlRW1wdHkiLCJ0cmF2ZXJzZSIsIl9fcmVkb21fbW91bnRlZCIsInRyaWdnZXIiLCJwYXJlbnRIb29rcyIsImhvb2siLCJwYXJlbnROb2RlIiwia2V5IiwiaG9va05hbWVzIiwic2hhZG93Um9vdEF2YWlsYWJsZSIsIndpbmRvdyIsIm1vdW50IiwicGFyZW50IiwiX2NoaWxkIiwiYmVmb3JlIiwicmVwbGFjZSIsIl9fcmVkb21fdmlldyIsIndhc01vdW50ZWQiLCJvbGRQYXJlbnQiLCJhcHBlbmRDaGlsZCIsImRvTW91bnQiLCJldmVudE5hbWUiLCJ2aWV3IiwiaG9va0NvdW50IiwiZmlyc3RDaGlsZCIsIm5leHQiLCJuZXh0U2libGluZyIsInJlbW91bnQiLCJob29rc0ZvdW5kIiwiaG9va05hbWUiLCJ0cmlnZ2VyZWQiLCJub2RlVHlwZSIsIk5vZGUiLCJET0NVTUVOVF9OT0RFIiwiU2hhZG93Um9vdCIsInNldFN0eWxlIiwiYXJnMSIsImFyZzIiLCJzZXRTdHlsZVZhbHVlIiwidmFsdWUiLCJzdHlsZSIsInhsaW5rbnMiLCJzZXRBdHRySW50ZXJuYWwiLCJpbml0aWFsIiwiaXNPYmoiLCJpc1NWRyIsIlNWR0VsZW1lbnQiLCJpc0Z1bmMiLCJzZXREYXRhIiwic2V0WGxpbmsiLCJzZXRDbGFzc05hbWUiLCJyZW1vdmVBdHRyaWJ1dGUiLCJzZXRBdHRyaWJ1dGUiLCJhZGRpdGlvblRvQ2xhc3NOYW1lIiwiY2xhc3NMaXN0IiwiYWRkIiwiYmFzZVZhbCIsInNldEF0dHJpYnV0ZU5TIiwicmVtb3ZlQXR0cmlidXRlTlMiLCJkYXRhc2V0IiwidGV4dCIsInN0ciIsImNyZWF0ZVRleHROb2RlIiwiYXJnIiwiaXNOb2RlIiwiSGVhZGVyIiwiX2NyZWF0ZUNsYXNzIiwicHJvcHMiLCJfY2xhc3NDYWxsQ2hlY2siLCJtb3VudFdpdGhIZWFkZXIiLCJyb290IiwiYXBwRGl2IiwiT2JqZWN0IiwiYXNzaWduIiwiRm9ybUhlYWRlciIsIm90aGVyUHJvcHMiLCJfb2JqZWN0V2l0aG91dFByb3BlcnRpZXMiLCJfZXhjbHVkZWQiLCJfZXh0ZW5kcyIsIkZvcm1DaGVja2JveCIsImxhYmVsIiwiY2hlY2tib3hJZCIsImNvbmNhdCIsIkljb24iLCJzcmMiLCJ3IiwiaCIsIlRhc2tJY29uQnV0dG9uIiwiYnRuIiwiaWNvbiIsIlRhc2tDb250cm9sQnV0dG9ucyIsIlRhc2tEZWFkbGluZSIsImRhdGUiLCJUYXNrIiwibmFtZSIsImRlYWRsaW5lIiwiVGFza05ld0J1dHRvbiIsInRleHRDb250ZW50IiwidGVzdFRhc2tzRGF0YSIsIlRhc2tzIiwibWFwIiwidGFza0RhdGEiLCJpbmRleCIsImdldEVsZW1lbnRCeUlkIl0sIm1hcHBpbmdzIjoiOztBQUFBLFNBQVNBLGFBQWFBLENBQUNDLEtBQUssRUFBRUMsRUFBRSxFQUFFO0VBQ2hDLE1BQU07SUFBRUMsR0FBRztJQUFFQyxFQUFFO0FBQUVDLElBQUFBO0FBQVUsR0FBQyxHQUFHQyxLQUFLLENBQUNMLEtBQUssQ0FBQztBQUMzQyxFQUFBLE1BQU1NLE9BQU8s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SUFDcEJDLEtBQUssRUFBRWIsS0FBSyxDQUFDMkIsSUFBSztJQUFDdkYsR0FBRyxFQUFFNEQsS0FBSyxDQUFDNUQ7R0FDekMsQ0FBQSxDQUFDLE1BQUFvRixZQUFBLENBQUE7SUFDUUMsSUFBSSxFQUFFekIsS0FBSyxDQUFDNEI7R0FBU0wsQ0FBQUEsRUFBQUEsSUFBQUEsa0JBQUEsSUFFaEMsQ0FBQztBQUNWLENBQUMsQ0FBQTs7QUNmK0QsSUFFNURNLGFBQWEsZ0JBQUE5QixZQUFBLENBQ2pCLFNBQUE4QixhQUFBQSxDQUFZN0IsS0FBSyxFQUFFO0FBQUFDLEVBQUFBLGVBQUEsT0FBQTRCLGFBQUEsQ0FBQTtBQUNqQixFQUFBLElBQU1SLEdBQUcsR0FBR2hCLE1BQU0sQ0FBQ0MsTUFBTSxDQUN2QmpHLFFBQVEsQ0FBQ1IsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUNoQztBQUNFaUIsSUFBQUEsSUFBSSxFQUFFLFFBQVE7QUFDZFosSUFBQUEsU0FBUyxFQUFFLHlCQUF5QjtBQUNwQzRILElBQUFBLFdBQVcsRUFBRTtBQUNmLEdBQ0YsQ0FBQztFQUVELElBQUksQ0FBQzNHLEVBQUUsR0FBR2tHLEdBQUc7QUFDZixDQUFDLENBQUE7O0FDUkgsSUFBTVUsYUFBYSxHQUFHLENBQ3BCO0FBQ0VKLEVBQUFBLElBQUksRUFBRSxXQUFXO0FBQ2pCQyxFQUFBQSxRQUFRLEVBQUU7QUFDWixDQUFDLENBQ0Y7QUFFRCxJQUFNSSxLQUFLLEdBQ1Q3RyxFQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsRUFDRUEsRUFBQSxDQUFBLEtBQUEsRUFBQTtFQUFLLE9BQU0sRUFBQTtBQUFNLENBQUEsRUFBQSxJQUFBb0YsVUFBQSxDQUFBO0FBQ0hkLEVBQUFBLElBQUksRUFBQztBQUFjLENBQzVCLENBQUEsQ0FBQyxFQUNOdEUsRUFBQSxDQUFBLEtBQUEsRUFBQTtFQUFLLE9BQU0sRUFBQTtBQUFzQixDQUFBLEVBQzlCNEcsYUFBYSxDQUFDRSxHQUFHLENBQUMsVUFBQ0MsUUFBUSxFQUFFQyxLQUFLLEVBQUE7QUFBQSxFQUFBLE9BQUEsSUFBQVQsSUFBQSxDQUFBO0lBQzNCQyxJQUFJLEVBQUVPLFFBQVEsQ0FBQ1AsSUFBSztJQUFDQyxRQUFRLEVBQUVNLFFBQVEsQ0FBQ04sUUFBUztJQUFDeEYsR0FBRyxFQUFBLE9BQUEsQ0FBQTJFLE1BQUEsQ0FBVW9CLEtBQUs7QUFBRyxHQUFBLENBQUE7QUFBQSxDQUMvRSxDQUFDLEVBQUEsSUFBQU4sYUFBQSxDQUFBLEVBQUEsQ0FFRSxDQUNGLENBQUM7QUFFUjNCLGVBQWUsQ0FDWDdGLFFBQVEsQ0FBQytILGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFDL0JKLEtBQ0osQ0FBQzs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdfQ==
