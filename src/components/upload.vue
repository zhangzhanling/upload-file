<template>
  <div class="upload">
    <div>
      <input type="file" @change="handleFileChange" />
      <el-button @click="handleUpload">上传</el-button>
      <el-button @click="pauseUpload">暂停</el-button>
      <el-button @click="ResumUpload">恢复</el-button>
    </div>
    <!--总进度-->
    <div>
      <div>计算文件 hash</div>
      <el-progress :percentage="hashPercentage"></el-progress>
      <div>总进度</div>
      <el-progress :percentage="fakeUploadPercentage"></el-progress>
    </div>
    <!--上传列表-->
    <el-table :data="data">
      <!--切片列-->
      <el-table-column
        prop="hash"
        label="切片hash"
        align="center"
      ></el-table-column>
      <!--大小列-->
      <el-table-column label="大小(KB)" align="center" width="120">
        <template v-slot="{ row }">
          {{ row.size | transformByte }}
        </template>
      </el-table-column>
      <!--进度列-->
      <el-table-column label="进度" align="center">
        <template v-slot="{ row }">
          <el-progress
            :percentage="row.procentage"
            color="#909399"
          ></el-progress>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
// 切片大小
const SLICE_SIZE = 500 * 1024
import Ajax from '../js/ajax'
export default {
  name: 'Upload',
  data(){
    return {
      container:{
        file:null
      },
      data:[],
      requestList:[],
      hashPercentage:0,
      fakeUploadPercentage:0
    }
  },
  filters: {
    transformByte(val) {
      return Number((val / 1024).toFixed(0));
    }
  },
  computed:{
    // 进度条
    percentage(){
      if(!this.container.file || !this.data.length){
        return 0
      }
      const loaded = this.data.map((item)=>{
        return item.chunk.size * item.procentage
      }).reduce((pre,cur)=>{
        return pre + cur
      })
      return Number((loaded / this.container.file.size).toFixed(2))
    }
  },
  watch:{
    percentage(now){
      if(now > this.fakeUploadPercentage){
        this.fakeUploadPercentage = now
      }
    }
  },
  methods:{
    handleFileChange(e){
      let files = e.target.files
      if(files.length == 0){
        return
      }
      this.container.file = files[0]
    },
    // 暂停上传
    pauseUpload(){
      this.requestList.forEach((item)=>{
        item.abort()
      })
      this.requestList = []
    },
    // 恢复上传
    async ResumUpload(){
      if(!this.container.file){
        return
      }
      let {uploadedList} = await this.verifyUpload({
        fileHash:this.container.file.hash,
        fileName:this.container.file.name
      })
      await this.startUpload(uploadedList)
    },
    // 点击上传时
    async handleUpload(){
      if(!this.container.file){
        return 
      }
      // 创建文件切片
      const fileChunkList = this.createFileChunk(this.container.file)
      // 计算文件hash
      this.container.file.hash = await this.calculateHash(fileChunkList)
      // 上传前，判断是否需要上传
      let {shouldUpload,uploadedList} = await this.verifyUpload({
        fileHash:this.container.file.hash,
        fileName:this.container.file.name
      })
      if(!shouldUpload){
        alert('文件上传成功')
        return
      }
      this.data = fileChunkList.map(({file},index)=>({
          hash:this.container.file.hash+'-'+index,
          fileHash:this.container.file.hash,
          chunk:file,
          index:index,
          size: file.size,
          procentage:uploadedList.includes(index) ? 100 : 0
      }))
      await this.startUpload(uploadedList)
    },
    // 生成文件切片
    createFileChunk(file){
      let fileSize = file.size
      let fileChunkList = []
      let start = 0
      while(start < fileSize){
        fileChunkList.push({file:file.slice(start,start+SLICE_SIZE)})
        start += SLICE_SIZE
      }  
      return fileChunkList
    },
    // 开始上传
    async startUpload(uploadedList = []){
      const requestList = this.data
      // 过滤已经上传的文件
      .filter(({hash})=>{
        return !uploadedList.includes(hash)
      })
      // 创建formData
      .map(({chunk,hash,index})=>{
        let formData = new FormData()
        formData.append('chunk',chunk)
        formData.append('hash',hash)
        formData.append('fileName',this.container.file.name)
        formData.append("fileHash", this.container.file.hash)
        return {formData,index}
      })
      // let request = []
      // for(var i=0; i<requestList.length; i++){
      //   request.push(await Ajax({
      //     url:'http://localhost:3000',
      //     method:'POST',
      //     data:requestList[i].formData,
      //     onProgress:function(e){
      //       let res = JSON.parse(e.target.response)
      //       if(res.code == '000'){
      //         e.target.abort()
      //         this.data = []
      //         alert('文件已存在')
      //       }else{
      //         this.createProgressHandler(e,this.data[i])
      //       }
      //     }.bind(this),
      //     requestList:this.requestList
      //   }))
      // }
      // 由于map无法中断，所以可以采取上面for循环的方式
      // 调用上传接口
      .map( async ({formData,index})=>{
        await Ajax({
          url:'http://localhost:3000',
          method:'POST',
          data:formData,
          onProgress:function(e){
            this.createProgressHandler(e,this.data[index])
          }.bind(this),
          requestList:this.requestList
        })
      })
      await Promise.all(requestList)
      // 如果已上传的文件和待上传的文件相加等于全部文件则合并
      if(uploadedList.length + requestList.length == this.data.length){
        await this.mergeQuest()
      }
    },
    // 生成进度条
    createProgressHandler(e,item){
        let pre = parseInt(String(e.loaded / e.total) * 100)
        item.procentage = pre
    },
    // 上传成功后，通知后台合并切片
    async mergeQuest(){
      await Ajax({
          url:'http://localhost:3000/merge',
          methods:"POST",
          data:JSON.stringify({
            size:SLICE_SIZE,
            fileName:this.container.file.name,
            fileHash:this.container.file.hash
          })
      })
    },
    // 计算文件hash
    calculateHash(fileChunkList){
      return new Promise((resolve)=>{
        // 利用webWorker计算文件hash，不影响主进程的任务
        this.container.worker = new Worker('/hash.js')
        this.container.worker.postMessage({fileChunkList})
        this.container.worker.onmessage = (e)=> {
          const {percentage,hash} = e.data
          this.hashPercentage = percentage
          if(hash){
            resolve(hash)
          }
        }
      })
    },
    // 验证接口
    async verifyUpload({fileHash,fileName}){
        const {data} = await Ajax({
          url:"http://localhost:3000/verify",
          data:JSON.stringify({
            fileHash,
            fileName
          })
        })
      return JSON.parse(data)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
