import { mount, el } from "../../node_modules/redom/dist/redom.es";
import FormHeader from "../components/forms/FormHeader.jsx";
import FormInputPassword from "../components/forms/FormInputPassword.jsx";
import FormInputEmail from "../components/forms/FormInputEmail.jsx";
import FormSwitchLabel from "../components/forms/FormSwitchLabel.jsx";
import FormButton from "../components/forms/FormButton.jsx";

const Login =
  <div class="container-md">
    <div class="mb-3">
      <FormHeader text="Вход"/>
    </div>
    <div class="mb-3">
      <FormInputEmail label="E-mail" placeholder="*@*.*" key="email"/>
    </div>
    <div class="mb-4">
      <FormInputPassword label="Пароль" placeholder="*" key="pwd"/>
      <FormSwitchLabel text="Нет аккаунта?" linkText="Зарегистрироваться" link="./register.html"/>
    </div>
    <FormButton text="Войти" type="success"/>
  </div>;
  
mount(
    document.getElementById("main"),
    Login
);
