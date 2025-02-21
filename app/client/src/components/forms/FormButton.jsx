import { el } from "../../../node_modules/redom/dist/redom.es";

class FormButton {
  constructor(props) {
    const {text, type, ...otherProps} = props;

    let bootstrapBtnType = "btn-light";
    switch(type) {
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
    const btn = Object.assign(
      document.createElement("button"),
      {
        type: "button",
        className: `btn ${bootstrapBtnType} w-100`,
        textContent: props.text,
        ...otherProps
      }
    );

    this.el =
      <div class="text-center">
        {btn}
      </div>
  }
}

export default FormButton;
