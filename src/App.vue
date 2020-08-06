<template>
  <div id="app">
    <Upload></Upload>
  </div>
</template>

<script>
import Upload from './components/upload'
export default {
  name: 'App',
  components:{
      Upload
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
