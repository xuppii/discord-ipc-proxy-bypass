import net from "net";
import 'dotenv/config'


const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const PIPE_NAME = "\\\\.\\pipe\\discord-ipc-1"; 
const FAKE_PIPE = "\\\\.\\pipe\\discord-ipc-0";


// create server on pipe 0
// connect to pipe 1 
// start listening
// find osu
// send modified osu to pipe1


const server = net.createServer().listen(FAKE_PIPE,()=>{console.log("listening")})