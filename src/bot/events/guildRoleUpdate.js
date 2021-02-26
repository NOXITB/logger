const send = require('../modules/webhooksender')

module.exports = {
  name: 'guildRoleUpdate',
  type: 'on',
  handle: async (guild, role, oldRole) => {
    const botPerms = guild.members.get(global.bot.user.id).permissions.json
    if (!botPerms.viewAuditLogs || !botPerms.manageWebhooks) return
    const guildRoleUpdateEvent = {
      guildID: guild.id,
      eventName: 'guildRoleUpdate',
      who: null,
      embed: {
        description: `A role was updated (${role.name})`,
        fields: [],
        color: role.color ? role.color : 3553599
      }
    }
    const oldKeys = Object.keys(oldRole)
    oldKeys.forEach(prop => {
      if (role[prop] !== oldRole[prop] && prop !== 'position' && prop !== 'permissions') {
        if (prop === 'color') {
          guildRoleUpdateEvent.embed.fields.unshift({
            name: toTitleCase(prop),
            value: `Now: ${intToHex(role[prop])}\nWas: ${intToHex(oldRole[prop])}`
          })
        } else {
          guildRoleUpdateEvent.embed.fields.unshift({
            name: toTitleCase(prop),
            value: `Now: ${role[prop]}\nWas: ${oldRole[prop]}`
          })
        }
      }
    })
    if (role.permissions.allow !== oldRole.permissions.allow || role.permissions.deny !== oldRole.permissions.deny) {
      const field = {
        name: 'Permissions changed',
        value: ''
      }
      const newPerms = Object.keys(role.permissions.json)
      const oldPerms = Object.keys(oldRole.permissions.json)
      const differentPerms = getDifference(newPerms, oldPerms).concat(getDifference(oldPerms, newPerms))
      differentPerms.forEach(perm => {
        if (role.permissions.json.hasOwnProperty(perm) && oldRole.permissions.json.hasOwnProperty(perm)) {
          if (role.permissions.json[perm] === true && oldRole.permissions.json[perm] === false) {
            field.value += `\n+ ${perm}`
          } else if (role.permissions.json[perm] === false && oldRole.permissions.json[perm] === true) {
            field.value += `\n− ${perm}`
          }
        } else if (role.permissions.json.hasOwnProperty(perm) && !oldRole.permissions.json.hasOwnProperty(perm)) {
          if (role.permissions.json[perm]) {
            field.value += `\n+ ${perm}`
          } else {
            field.value += `\n− ${perm}`
          }
        } else if (!role.permissions.json.hasOwnProperty(perm) && oldRole.permissions.json.hasOwnProperty(perm)) {
          field.value += `\n- ${perm}`
        }
      })
      if (field.value) guildRoleUpdateEvent.embed.fields.push(field)
    }
    await setTimeout(async () => {
      const logs = await guild.getAuditLogs(1, null, 31)
      const log = logs.entries[0]
      if (log && log.user && Date.now() - ((log.id / 4194304) + 1420070400000) < 3000) {
        guildRoleUpdateEvent.embed.fields.push({
          name: 'ID',
          value: `\`\`\`ini\nRole = ${role.id}\nPerpetrator = ${log.user.id}\`\`\``
        })
        guildRoleUpdateEvent.embed.author = {
          name: `${log.user.username}#${log.user.discriminator}`,
          icon_url: log.user.avatarURL
        }
        if (guildRoleUpdateEvent.embed.fields.length === 1) return
        await send(guildRoleUpdateEvent)
      } else {
        guildRoleUpdateEvent.embed.fields.push({
          name: 'ID',
          value: `\`\`\`ini\nRole = ${role.id}\nPerpetrator = Unknown\`\`\``
        })
        if (guildRoleUpdateEvent.embed.fields.length === 1) return
        await send(guildRoleUpdateEvent)
      }
    }, 1000)
  }
}

function intToHex (num) {
  num >>>= 0
  const b = num & 0xFF
  const g = (num & 0xFF00) >>> 8
  const r = (num & 0xFF0000) >>> 16
  return rgbToHex(r, g, b)
}

function toTitleCase (str) {
  return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase() })
}

function rgbToHex (r, g, b) { // bitwise math is black magic
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function getDifference (array1, array2) {
  return array1.filter(i => {
    return array2.indexOf(i) < 0
  })
}
