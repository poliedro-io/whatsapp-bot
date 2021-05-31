


async function run({ message, recipients }, task) {
    if (!message || !recipients || !recipients.length)
        return ''

    task.log('Esperando permiso.')
    await new Promise(resolve => {
        setTimeout(function () {
            resolve()
        }, 2000);
    })
    task.setStatus(task.states.RUNNING)
    task.log('Comenzando a enviar')

    for (let index = 0; index < recipients.length; index++) {
        let res = await sendMessage(recipients[index], index+1, recipients.length)

        if (task.socket.readyState != 1)
            throw Error('Abortado')
        task.setProgress((index + 1) / recipients.length)
        task.log(res)
    }

    return Promise.resolve('Completado!')


}

function sendMessage(number, index, total) {
    return new Promise(resolve => {
        setTimeout(function () {
            resolve(`[${index}/${total}] Mensaje enviado a ${number}`)
        }, 1000);
    })
}

module.exports = {
    run
}