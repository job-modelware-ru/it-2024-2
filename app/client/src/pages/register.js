import { mount, el } from "../../node_modules/redom/dist/redom.es";
import FormHeader from "../components/forms/FormHeader.jsx";
import FormInputPassword from "../components/forms/FormInputPassword.jsx";
import FormInputEmail from "../components/forms/FormInputEmail.jsx";
import FormSwitchLabel from "../components/forms/FormSwitchLabel.jsx";
import FormButton from "../components/forms/FormButton.jsx";

const Register =
  <div class="container-md">
    <div class="mb-3">
      <FormHeader text="Регистрация"/>
    </div>
    <div class="mb-3">
      <FormInputEmail label="E-mail" placeholder="*@*.*" key="email"/>
    </div>
    <div class="mb-3">
      <FormInputPassword label="Пароль" placeholder="*" key="pwd"/>
    </div>
    <div class="mb-4">
      <FormInputPassword label="Повторите пароль" placeholder="*" key="pwd-repeat"/>
      <FormSwitchLabel text="Уже есть аккаунт?" linkText="Войти" link="./login.html"/>
    </div>
    <FormButton text="Зарегистрироваться" type="success"/>
  </div>;

mount(
    document.getElementById("main"),
    Register
);
