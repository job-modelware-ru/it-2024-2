import { mount, el } from "../../node_modules/redom/dist/redom.es";
import Header from "../components/Header.jsx";

export default function mountWithHeader(root, element) {
  const appDiv = Object.assign(
    document.createElement("div"),
    {
      className: "container centered"
    }
  )
  appDiv.appendChild(element);

  mount(
    root,
    <div class="app-body">
      <Header />
      {appDiv}
    </div>
  )
};
