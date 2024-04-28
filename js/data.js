class Project{

    constructor(){
        this.title = ""
        this.description = ""
        this.createdAt = null
        this.modifiedAt = null
        this.images = []
        this.tasks = []
        this.tags = []
    }

    getRatio(){
        if(!this.tasks) return null;
        return this.tasks.reduce((p,c) => c.finished ? p+1 : p, 0)/this.tasks.length
    }

}

class Tag{

    constructor(name, color){
        this.name = name ?? ""
        this.color = color ?? ""
    }

    toHTML(){
        let element = document.createElement('div')
        element.classList.add('etiquette')
        element.innerText = this.name
        element.style.backgroundColor = this.color
        return element
    }

}

class AbstractTask{

    constructor(){
        this.id = ""
        this.name = ""
        this.createdAt = null
        this.modifiedAt = null
        this.finished = false
        this.finishedAt = null
    }

}

class Task extends AbstractTask{

    constructor(project){
        super()
        this.project = project
        this.description = ""
        this.subtasks = []

        this.project.tasks.push(this)

        this.onCheck = null
    }

    getDoneSubtasks(){
        return this.subtasks.reduce((p,c) => c.finished ? p+1 : p, 0)
    }

    toHTML(){
        let element = document.createElement("div")
        element.classList.add('tache')
        
        let header = element.create('div.tache_header')
        let numero = header.create('p.numero')
        let enonce = header.create('p.enonce')
        let checkbox = header.create('input[type="checkbox"].checkbox')

        if(this.finished && this.finishedAt){
            let date = element.create(`p.date`)
            date.innerText = `Fini le ${dateToText(this.finishedAt)}`
        }
        
        numero.innerText = `#${this.id}`
        enonce.innerText = this.name
        checkbox.checked = this.finished

        let updateHeader = (checked) => {
            if(checked) element.setAttribute('finished', true)
            else element.removeAttribute('finished')
        }

        checkbox.addEventListener('change', e => {
            let value = e.currentTarget.checked
            if(this.onCheck) this.onCheck(checkbox, value)
            updateHeader(value)
        })
        
        if(this.subtasks.length){
            let compteur = header.create('p.compteur')
            compteur.innerText = `${this.getDoneSubtasks()}/${this.subtasks.length}`
        }

        updateHeader(this.finished)
        return element
    }

}

class SubTask extends AbstractTask{

    constructor(task){
        super()
        this.task = task

        this.task.subtasks.push(this)
    }

}