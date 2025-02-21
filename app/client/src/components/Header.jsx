import { el } from "../../node_modules/redom/dist/redom.es";

class Header {
  constructor(props) {
    this.el =
      <div class="header">
        <h1>Список дел</h1>
        <button type="button" class="btn">Выход</button>
      </div>
  }
}

export default Header;
