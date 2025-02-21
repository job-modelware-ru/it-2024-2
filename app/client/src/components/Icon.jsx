import { el } from "../../node_modules/redom/dist/redom.es";

class Icon {
  constructor(props) {
    this.el =
      <img src={`./icons/${props.src}`} style={`width:${props.w}px;height:${props.h}px;`}/>
  }
}

export default Icon;
