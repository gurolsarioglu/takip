const os=require('os');console.log(JSON.stringify({total:Math.round(os.totalmem()/1e9),free:Math.round(os.freemem()/1e9),cpus:os.cpus().length,model:os.cpus()[0].model}));
