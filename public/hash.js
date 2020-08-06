self.importScripts('/spark-md5.min.js')

self.onmessage = (e)=> {
    let {fileChunkList} = e.data
    let percentage = 0
    let count = 0
    let spark = new self.SparkMD5.ArrayBuffer()
    const loadText = (index) => {
        let fileReader = new FileReader()
        fileReader.readAsArrayBuffer(fileChunkList[index].file)
        fileReader.onload = e => {
            spark.append(e.target.result)
            count++
            if(count == fileChunkList.length){
                self.postMessage({
                    percentage:100,
                    hash:spark.end()
                })
                self.close()
            }else{
                percentage += 100 / fileChunkList.length
                self.postMessage({
                    percentage
                })
                loadText(count)
            }
        }
    }
    loadText(0)
}