require('dotenv').config()
const schedule = require('node-schedule');
const AsciiTable = require('ascii-table')
const axios = require('axios');
const fs = require('fs');

const color = {
    leaderboard: 5814783,
    newDevs: 5814783,
    devsUpdate: 5814783
}

async function getData() {
    return await axios.get(`${process.env.LEADERBOARD_URI}.json`, {
        headers: {
            'Content-Type': 'application/json',
            Cookie: `session=${process.env.SESSION_COOKIE};`
        },
    });
}

async function postWebhook(data) {
    try {
        return await axios.post(process.env.DISCORD_URI, data, {
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (err) {
        console.log(err)
    }
}

let job = schedule.scheduleJob({rule: "*/30 * * * *"}, async function() {
    console.log("triggered")
    const response = await getData()
    let stored = null
    const data = response.data
    try {
        stored = JSON.parse(fs.readFileSync('./stored.json', 'utf8'))
    } catch (err) {
        console.log("stored.json not found")
    }

    let leaderboard = []

    let newDevs = {
        title: "New players in the leaderboard!",
        description: "New players have arrived, welcome them!",
        color: color.newDevs,
        fields: []
    }
    let devsUpdate = {
        title: "Players update their scores!",
        description: "Some developers have more :star: now!",
        color: color.devsUpdate,
        fields: []
    }

    Object.values(data.members).forEach((current) => {
        let currentStored = false

        if (stored) {
            currentStored = stored.members[current.id]
        }
        
        leaderboard.push({
            name: current.name,
            stars: current.stars,
            lastStarTs: parseInt(current.last_star_ts),
            score: current.local_score
        })

        if (!currentStored) {
            newDevs.fields.push({
                name: `**${current.name}**`,
                value: `:star: ${current.stars}`,
                inline: true
            })
            return
        }

        if (current.stars > currentStored.stars) {
            const diff = current.stars - currentStored.stars
            devsUpdate.fields.push({
                name: `**${current.name}**`,
                value: `:star: ${current.stars}`,
                inline: true
            })
        }
    })

    if (newDevs.fields.length < 1 && devsUpdate.fields.length < 1) {
        return;
    }

    leaderboard.sort((a, b) => {
        if (a.score > b.score) {
            return -1
        } else if (a.score < b.score) {
            return 1
        } else if (a.lastStarTs > b.lastStarTs) {
            return 1
        } else {
            return -1
        }
    })

    var asciiTable = new AsciiTable()

    asciiTable
        .setHeading('#', 'Score', '⭐️', 'Developer')
        .setAlign(0, AsciiTable.CENTER)
        .setAlign(1, AsciiTable.CENTER)
        .setAlign(2, AsciiTable.CENTER)
        .removeBorder()

    for (let i = 0; i < leaderboard.length; ++i) {
        asciiTable.addRow(i + 1, leaderboard[i].score, leaderboard[i].stars, leaderboard[i].name);
    }

    const leaderboardEmbed = {
        title: "Leaderboard",
        description: `\`\`\`${asciiTable.toString()}\`\`\``,
        url: process.env.LEADERBOARD_URI,
        author: {
            name: "Advent of Code",
            url: process.env.LEADERBOARD_URI,
            icon_url: "https://adventofcode.com/favicon.png"
        },
        color: color.leaderboard,
        timestamp: new Date().toISOString(),
        footer: {
        icon_url: process.env.LEADERBOARD_URI
        },
    }

    let webhookData = {
        content: null,
        embeds: [
            leaderboardEmbed
        ]
    }

    if (newDevs.fields.length > 0) {
        if (newDevs.fields.length > 25) {
            let tmp = newDevs.fields
            newDevs.fields = tmp.splice(0, 25)
            webhookData.embeds.push(newDevs)
            while (tmp.length > 25) {
                webhookData.embeds.push({
                    color: color.newDevs,
                    fields: tmp.splice(0, 25)
                })
            }
            if (tmp.length > 0) {
                webhookData.embeds.push({
                    color: color.newDevs,
                    fields: tmp
                })
            }
        } else {
            webhookData.embeds.push(newDevs)
        }
    }

    if (devsUpdate.fields.length > 0) {
        if (devsUpdate.fields.length > 25) {
            let tmp = devsUpdate.fields
            devsUpdate.fields = tmp.splice(0, 25)
            webhookData.embeds.push(devsUpdate)
            while (tmp.length > 25) {
                webhookData.embeds.push({
                    color: color.devsUpdate,
                    fields: tmp.splice(0, 25)
                })
            }
            if (tmp.length > 0) {
                webhookData.embeds.push({
                    color: color.devsUpdate,
                    fields: tmp
                })
            }
        } else {
            webhookData.embeds.push(devsUpdate)
        }
    }

    await postWebhook(webhookData)

    fs.writeFileSync("stored.json", JSON.stringify(response.data))
});







