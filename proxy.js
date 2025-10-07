import net from "net";
import 'dotenv/config'
import { promiseHooks } from "v8";


const CLIENT_ID = process.env.DISCORD_CLIENT_ID //api key leak gg
const PIPE_NAME = "\\\\.\\pipe\\discord-ipc-1"; 
const FAKE_PIPE = "\\\\.\\pipe\\discord-ipc-0";


// create server on pipe 0
// connect to pipe 1 
// start listening
// find osu
// send modified osu to pipe1


// first test out having all proxy set up
// and then connect my personal client to the proxy
// and then having it show up as my status yes!

// create a server that listens to the ipc pipe that discord uses and that all applications will send their data to
// after that has created print listening in terminal
const server = net.createServer().listen(FAKE_PIPE,()=>{console.log("listening")})

//open connection to discord ipc server 

server.getConnections((err,count)=>console.log(count))

server.on('connection',async() =>
    {

        const client = await loopConnection(PIPE_NAME)

        
    }
)
async function loopConnection(PIPE_NAME){
    while (true){
        try{
            const client = await new Promise((resolve,reject)=>
            {
                const socket = net.createConnection(PIPE_NAME);
                socket.once("connect", ()=>resolve(socket));
                socket.once("error",reject);
            })
            console.log("connected");
            return client;
        }
        catch{
            console.log("retry")
            await new Promise((resolve,reject)=>
            {
                setTimeout(()=>
                {
                    resolve();
                }
                ,1000)
            })
        }
    }
}
// const client = await 





function buildFrame(opcode, payload) {
    const json = JSON.stringify(payload);
    const data = Buffer.from(json, "utf8");
    const frame = Buffer.alloc(8 + data.length);
    frame.writeInt32LE(opcode, 0); 
    frame.writeInt32LE(data.length, 4); 
    data.copy(frame, 8);
    return frame;
}

// // ---------- CONNECT ----------
// const client = net.createConnection(PIPE_NAME, () => {
//     console.log("Connected to Discord IPC");

//     // // ---------- HANDSHAKE ----------
//     const handshake = { v: 1, client_id: CLIENT_ID };
//     client.write(buildFrame(0, handshake)); // opcode 0 = handshake
// });

// // ---------- HANDLE RESPONSES ----------
// client.on("data", (buffer) => {
//     let offset = 0;
//     while (offset < buffer.length) {
//         const opcode = buffer.readInt32LE(offset);
//         const length = buffer.readInt32LE(offset + 4);
//         const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
//         try {
//             const data = JSON.parse(jsonData);
//             console.log("Received:", data);
//         } catch (e) {
//             console.log("Non-JSON data:", jsonData);
//         }
//         offset += 8 + length;
//     }
// });
// client.on("error", (err) => console.error("IPC Error:", err.message));
// client.on("end", () => console.log("Discord IPC closed."));
// // ---------- SEND ACTIVITY ----------
// function setActivity() {
//     const payload = {
//         cmd: "SET_ACTIVITY",
//         args: {
//             pid: process.pid,
//             activity: {
//                 state: "Idle",
//                 details: "tech enjoyer",
//                 assets: {
//                     large_image: "osu_logo",
//                     large_text: "mudkip blicky",
//                     small_image: "mode_0",
//                     small_text: "osu!"
//                 },
//                 buttons: [
//                     { label: "My profile", url: "https://osu.ppy.sh/users/19266840" }
//                 ],
//                 instance: false
//             }
//         },
//         nonce: Math.random().toString(36).substring(2)
//     };
//     client.write(buildFrame(1, payload)); // opcode 1 = frame/command
// }

// // wait a few seconds to ensure handshake is complete
// setTimeout(setActivity, 2000);


