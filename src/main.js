import Vue from 'vue'
import App from './App.vue'
import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(Element)
Vue.config.productionTip = false

console.log(process.env.VUE_APP_TYPE)
console.log(process.env.NODE_ENV)

new Vue({
  render: h => h(App),
}).$mount('#app')
