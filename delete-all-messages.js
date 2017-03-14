var authToken = 'CHANGE_TO_CHANNEL_ID'
    
if (typeof(blockedAuthors) === 'undefined') {
    var blockedAuthors = []
}

clearMessages = function() {
    const channel = window.location.href.split('/').pop()
    const baseURL = `https://discordapp.com/api/channels/${channel}/messages`
    const headers = { Authorization: authToken }

    let clock = 0
    let interval = 500
    let beforeId = null
    let messagesStore = []

    function delay(duration) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, duration)
        })
    }
    
    function loadMessages() {
        
        let url = `${baseURL}?limit=100`
        
        if (beforeId) {
            url += `&before=${beforeId}`
        }
        
        return fetch(url, { headers })
    }
    
    function tryDeleteMessage(message) {
        if (blockedAuthors.indexOf(message.author.id) === -1) {
            
            console.log(`Deleting message from ${message.author.username} (${message.content.substring(0, 30)}...)`)
                        
            return fetch(`${baseURL}/${message.id}`, { headers, method: 'DELETE' })
        }
    }
    
    function filterMessages(message) {
        return blockedAuthors.indexOf(message.author.id) === -1
    }
    
    function onlyNotDeleted(message) {
        return message.deleted === false
    }
    
    loadMessages()
        .then(resp => resp.json())
        .then(messages => {
            if (messages === null || messages.length === 0) {
                console.log(`We loaded all messages in this chat`)
                
                return
            }

            beforeId = messages[messages.length-1].id
            
            messages.forEach(message => { message.deleted = false })
            
            messagesStore = messagesStore.concat(messages.filter(filterMessages))
                
            return Promise.all(messagesStore.filter(onlyNotDeleted).map(message => {
                return delay(clock += interval)
                    .then(() => tryDeleteMessage(message))
                    .then(resp => {
                        if (resp && resp.status === 204) {
                            message.deleted = true
                            return resp.text()
                        }
                    })
                    .then(result => {
                        if (result) {
                            result = JSON.parse(result)

                            if (result.code === 50003) {
                                
                                console.log(`Cannot delete messages from user ${message.author.username}, skiping it`)
                                
                                blockedAuthors.push(message.author.id)
                                
                                messagesStore = messagesStore.filter(filterMessages)
                            }
                        }
                    })
            }))
        })
        .then(function() {
            if (messagesStore.length !== 0 && messagesStore.length < 100) {
                clearMessages()
            } else {
                console.log(`Finished clearing cycle. You can run again this script if you want delete next 100 messages`)
				neverEndingStory();
            }
        })
}

function neverEndingStory(){
clearMessages()
}

neverEndingStory()
