import net from "net";
import 'dotenv/config'
import * as osu from "osu-api-v2-js"


const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID //need to include your discord application id
const OSU_API_CLIENT_ID = process.env.OSU_API_CLIENT_ID //create oath2 in your osu profile to get these two variables
const OSU_API_CLIENT_SECRET = process.env.OSU_API_CLIENT_SECRET

const PIPE_NAME = "\\\\.\\pipe\\discord-ipc-1"; 
const FAKE_PIPE = "\\\\.\\pipe\\discord-ipc-0";
const api = await osu.API.createAsync(OSU_API_CLIENT_ID, OSU_API_CLIENT_SECRET)

// create server on pipe 0
// connect to pipe 1 
// start listening
// find osu
// send modified osu to pipe1


// first test out having all proxy set up
// and then connect my personal client to the proxy
// and then having it show up as my status

// create a server that listens to the ipc pipe that discord uses and that all applications will send their data to
// after that has created print listening in terminal
const server = net.createServer().listen(FAKE_PIPE,()=>{console.log("listening")})
const client = await loopConnection(PIPE_NAME)
//open connection to discord ipc server 
const OSU_ID = 367827983903490050; // this is osu's application id no need to worry 

const APPLICATION_HANDSHAKE = { v: 1, client_id: APPLICATION_ID };
// quick application connect to get handshake id
const FAKE_HANDSHAKE = await new Promise((resolve,reject)=>
{
    const applicationClient = net.createConnection(PIPE_NAME, () => {
        console.log("Connected to Discord IPC");
    
        const handshake = { v: 1, client_id: APPLICATION_ID };
        client.on("data", (buffer) => {
            let offset = 0;
            while (offset < buffer.length) {
                const opcode = buffer.readInt32LE(offset);
                const length = buffer.readInt32LE(offset + 4);
                const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
                try {
                    const data = JSON.parse(jsonData);
                    console.log("Discord Server Received:", data);
                    applicationClient.end();
                    resolve(buffer)
                    
                } catch (e) {
                    console.log("Non-JSON data:", jsonData);
                }
                offset += 8 + length;
            }
                    //socket.write(buffer)
        });
        client.write(buildFrame(0, handshake)); // opcode 0 = handshake
    
    });
    applicationClient.on('error',reject)
})

console.log(FAKE_HANDSHAKE)


server.on('connection',async(socket) =>
    {

        socket.on("data", (buffer) => {
            let offset = 0;
            while (offset < buffer.length) {
                const opcode = buffer.readInt32LE(offset);
                const length = buffer.readInt32LE(offset + 4);
                const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
                try {
                    const data = JSON.parse(jsonData);
                    
                    console.log("My Server Received:", data);
                    //console.log(data.client_id)
                    if(data?.client_id == OSU_ID)
                    {
                        console.log("osu")
                        socket.write(FAKE_HANDSHAKE)
                        //client.write(buildFrame(0, APPLICATION_HANDSHAKE));
                    }
                    else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "Idle")
                    {
                        setActivityIdle(data.args.activity.assets.large_text)    
                    }
                    else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "Clicking circles")
                    {
                        setActivityClicking(data.args.activity.details,data.args.activity.assets.large_text)    
                    }
                } catch (e) {
                    console.log("Non-JSON data:", jsonData);
                }
                offset += 8 + length; 
            }
            //client.write(buffer)
        });
        socket.on("close",()=>{
            client.destroy();
        })
        client.on("data", (buffer) => {
            let offset = 0;
            while (offset < buffer.length) {
                const opcode = buffer.readInt32LE(offset);
                const length = buffer.readInt32LE(offset + 4);
                const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
                try {
                    const data = JSON.parse(jsonData);
                    console.log("Discord Server Received:", data);
                } catch (e) {
                    console.log("Non-JSON data:", jsonData);
                }
                offset += 8 + length;
            }

        });
        client.on("close",()=>{
            socket.destroy();
        })
        
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


function setActivityIdle(large_text) {
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "Idle",
                details: "tech enjoyer",
                assets: {
                    large_image: "https://imgs.search.brave.com/WxyV9MqwtZie3vAyhcCET4KiN8z_LSV7jqMAutpF6Rc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50ZW5vci5jb20v/QXQtOXU5dVVZdlVB/QUFBTS9tdWRraXAt/cGlzc2luZy1tdWRr/aXAuZ2lm.gif",
                    large_text: "mudkip blicky",
                    small_image: "osu-game-font",
                    small_text: large_text
                },
                buttons: [
                    { label: "osu profile", url: "https://osu.ppy.sh/users/19266840" }
                ],
                instance: false
            }
        },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}


async function setActivityClicking(details,large_text) {
    const [mapUrl,coverUrl,difficultyRating,mapBpm,mapLength] = await searchBeatmap(details)
    const time = Math.floor(Date.now() / 1000)
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "["+details+"]",
                details: "clicking?.circles",
                assets: {
                    large_image: coverUrl,
                    large_text: "map background",
                    small_image: "osu-game-font",
                    small_text: large_text
                },
                buttons: [
                    { label: difficultyRating + "* | " + mapBpm +" bpm  | "  + formatTime(mapLength) +" mins", url: "https://www.youtube.com/watch?v=cG21b8Kx2DI" },
                    { label: "current map link", url: mapUrl}
                ],
                instance: false
            }
        },
        timestamps: {
            start: Math.floor(Date.now() / 1000),
            end: Math.floor(Date.now() / 1000) + mapLength
          },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}


function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  

// TODO: more robust error handling + default map fall back on error 
async function searchBeatmap(q) {
    const placeHolder = "https://osu.ppy.sh/beatmapsets/1073074#osu/2245783"
    const query = q.match(/-\s*(.*?)\s*\[/)[1]
    try {
        const results = await api.searchBeatmapsets({ keywords: query, mode: "osu", categories:"Any"});

        if (!results.beatmapsets || results.beatmapsets.length === 0) {
            console.log("No beatmaps found for query:", query);
            return placeHolder;
        }

        //const beatmapset = results.beatmapsets[1];
        const targetVersion = q.match(/\[(.*?)\]/)[1]

        for(const beatmapset of results.beatmapsets.slice(0,10)){
            //console.log(beatmapset)
            for(const beatmap of beatmapset.beatmaps)
            {
                //console.log(beatmap.version)
                if(beatmap.version==targetVersion)
                {
                    return [beatmap.url,beatmapset.covers['list@2x'],beatmap.difficulty_rating,beatmap.bpm,beatmap.total_length]
                }
            }
        }
        try{
            const queryWithArtist = q.match(/^(.*?)\s*\[/)[1];
            const results = await api.searchBeatmapsets({ keywords: queryWithArtist, mode: "osu", categories:"Any"});

            if (!results.beatmapsets || results.beatmapsets.length === 0) {
                console.log("No beatmaps found for query:", query);
                return placeHolder;
            }

            //const beatmapset = results.beatmapsets[1];
            const targetVersion = q.match(/\[(.*?)\]/)[1]

            for(const beatmapset of results.beatmapsets.slice(0,10)){
                //console.log(beatmapset)
                for(const beatmap of beatmapset.beatmaps)
                {
                    //console.log(beatmap.version)
                    if(beatmap.version==targetVersion)
                    {
                        return [beatmap.url,beatmapset.covers['list@2x'],beatmap.difficulty_rating,beatmap.bpm,beatmap.total_length]
                    }
                }
            }
        }
        catch{}
        return placeHolder

    } catch (err) {
        console.error("Error searching for beatmap:", err);
        return placeHolder;
    }
}