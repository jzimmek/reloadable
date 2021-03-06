import express from "express"
import chokidar from "chokidar"

export default (app,{requireFile,watch,clearIf,watchOpts,args=[]}) => {

  if(!clearIf)
    clearIf = (file) => file.indexOf("node_modules") === -1

  let router = express.Router(),
      {default: fn, tearDown} = require(requireFile)

  fn.apply(null, [router, ...args])

  chokidar.watch(watch, {
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
    ignoreInitial: true,
    ...watchOpts
  }).on("all", () => {
    Promise
      .resolve(tearDown ? tearDown() : null)
      .then(() => {
        Object.keys(require.cache).forEach(function(key){
          if(clearIf(key))
          delete require.cache[key]
        })

        let {default: nextFn, tearDown: nextTearDown} = require(requireFile)

        router = express.Router()
        nextFn.apply(null, [router, ...args])
        tearDown = nextTearDown
      })
      .catch((err) => {
        console.error("ERR", err)
      })
  })

  app.use("/", (req,res,next) => {
    router(req,res,next)
  })
}
