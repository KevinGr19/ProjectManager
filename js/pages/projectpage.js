page_loads["projectpage"] = () => {

    //#region Data
    let original_project = null
    let project = null

    function setupData(){
        project = original_project.clone()
        project = Watcher.toWatcherProxy(project)

        for(let i in project.tasks){
            let task = project.tasks[i]
            project.tasks[i] = Watcher.toWatcherProxy(task)

            for(let j in task.subtasks){
                let subtask = task.subtasks[j]
                task.subtasks[j] = Watcher.toWatcherProxy(task.subtasks[j])
                subtask.task = task
            }
        }
    }
    
    async function updateProject(){
        project.modifiedAt = new Date()
        project.tasks = project.tasks.filter(t => !t.markedRemove)
        project.tasks.forEach((t,i) => {
            t.id = i+1
            t.subtasks = t.subtasks.filter(st => !st.markedRemove)
            t.subtasks.forEach((st, j) => {
                st.id = `${t.id}.${j+1}`
            })
        })
    }

    async function loadProject(){
        if(project) original_project = project.clone()
        else original_project = generateFakeProject()

        setupData()
        projectVM.project = project
    }
    //#endregion
    
    //#region IHM
    class ProjectVM{

        #project = null

        constructor(root){
            this.root = root

            this.t_title = root.querySelector(".title")
            this.i_title = root.querySelector("#titre-projet")
            this.i_description = root.querySelector("#description-projet")
            this.t_created = root.querySelector("#created-projet")
            this.t_modified = root.querySelector("#modified-projet")
            this.t_taskCounter = root.querySelector("#taches-compteur")
            this.b_addTask = root.querySelector("#taches-ajout")
            this.d_tags = root.querySelector("#etiquettes-projet")
            this.d_progressBar = root.querySelector("#progressbar")
            this.t_progressBar = root.querySelector("#text-progressbar")
            this.d_progressFill = this.d_progressBar.querySelector("span")
            this.d_tasks = root.querySelector("#taches-projet")

            this.b_addTask.addEventListener('click', () => {
                if(isHardEdit()) this.createNewTask()
            })

            this.tasksVM = []
            this.lightboxTaskVM = null

            this.setupBindingTo()
        }

        get project(){
            return this.#project
        }

        set project(value){
            this.#project = value
            this.setupBindingFrom()
            this.updateAll()
            this.refreshLightbox()
        }

        //#region Binding
        setupBindingTo(){
            this.i_title.addEventListener('change', e => this.project.title = e.currentTarget.value)
            this.i_description.addEventListener('change', e => this.project.description = e.currentTarget.value)
        }

        setupBindingFrom(){
            this.project.watcher.listen('title', 'vm', () => this.updateTitle())
            this.project.watcher.listen('description', 'vm', () => this.updateDescription())
        }

        updateTitle(){
            this.i_title.value = this.t_title.innerText = this.project.title
        }

        updateDescription(){
            this.i_description.value = this.project.description
        }

        updateDates(){
            this.t_created.innerText = dateToText(this.project.createdAt)
            this.t_modified.innerText = dateToText(this.project.modifiedAt)
        }

        updateTaskVisuals(){
            let doneTasks = this.project.getDoneTasks()
            this.t_taskCounter.innerText = `${doneTasks}/${this.project.tasks.length} tâches`

            if(!this.project.tasks.length)
                this.d_progressBar.classList.add('hide')
            else {
                let ratio = doneTasks/this.project.tasks.length*100
                this.d_progressBar.classList.remove('hide')
                this.d_progressFill.style.width = `${ratio}%`
                this.t_progressBar.innerText = `${Math.round(ratio)}%`
            }
        }

        updateTasks(){
            this.tasksVM.length = 0
            this.d_tasks.innerHTML = ''

            this.project.tasks.forEach(task => this.addTask(task))
        }

        updateTags(){
            this.d_tags.innerHTML = ''
            this.project.tags.forEach(tag => this.d_tags.appendChild(tag.toHTML()))
        }

        updateAll(){
            this.updateTitle()
            this.updateDescription()
            this.updateDates()
            this.updateTaskVisuals()
            this.updateTasks()
            this.updateTags()
        }
        //#endregion

        refreshEditMode(){
            this.i_title.toggleAttribute('readonly', !isHardEdit())
            this.i_description.toggleAttribute('readonly', !isHardEdit())
            this.b_addTask.classList.toggle('hide', !isHardEdit())

            this.tasksVM.forEach(vm => vm.refreshEditMode())
            this.lightboxTaskVM?.refreshEditMode()
        }

        openTask(task){
            if(!this.lightboxTaskVM){
                loadLightbox("task-lightbox", {
                    onClose: () => {
                        this.lightboxTaskVM.removeBinding()
                        this.lightboxTaskVM = null
                    }
                })
                this.lightboxTaskVM = new TaskLightBoxVM(lightbox)
                this.lightboxTaskVM.refreshEditMode()
            }

            this.lightboxTaskVM.task = task
        }

        addTask(task){
            let taskVM = new TaskVM(this.d_tasks)
            taskVM.task = task

            this.tasksVM.push(taskVM)
            return taskVM
        }

        createNewTask(){
            let newTask = Watcher.toWatcherProxy(new Task(this.project))
            this.project.tasks.push(newTask)

            newTask.id = this.project.tasks.length
            newTask.name = `Tâche ${newTask.id}`

            let vm = this.addTask(newTask)
            vm.root.classList.add('added')

            this.updateTaskVisuals()
            vm.i_name.select()
        }

        refreshLightbox(){
            if(!this.lightboxTaskVM) return

            let task = this.project.tasks.find(t => t.id == this.lightboxTaskVM.task.id)
            if(task) this.lightboxTaskVM.task = task
            else closeLightbox()
        }
    }

    class AbstractTaskVM{

        #task = null

        constructor(root){
            this.root = root.create('div.tache')
            this.header = this.root.create('div.tache_header')
            this.t_id = this.header.create('p.numero')
            this.i_name = this.header.create('input[type="text"].enonce')
            this.t_name = this.header.create('p.enonce')
            this.i_checkbox = this.header.create('input[type="checkbox"].checkbox')
            this.t_date = this.root.create('p.date')

            this.root.addEventListener('contextmenu', e => {
                e.preventDefault()
                this.openContextMenu(e)
            })

            this.setupBindingTo()
            this.refreshEditMode()
        }

        get task(){
            return this.#task
        }

        set task(value){
            this.#task = value
            this.setupBindingFrom()
            listenTaskCheckbox(this.task)
            this.updateAll()
        }

        //#region Binding
        setupBindingTo(){
            this.i_checkbox.addEventListener('change', e => this.task.finished = e.currentTarget.checked)
            this.i_name.addEventListener('change', e => this.task.name = e.currentTarget.value)

            this.i_checkbox.addEventListener('click', e => e.stopPropagation())
            this.i_name.addEventListener('click', e => e.stopPropagation())
        }

        setupBindingFrom(){
            this.task.watcher.listen('finished', 'vm', () => this.updateFinished())
            this.task.watcher.listen('name', 'vm', () => this.updateName())
            this.task.watcher.listen('markedRemove', 'vm', () => this.updateRemoveOutline())
        }

        updateId(){
            this.t_id.innerText = `#${this.task.id}`
        }

        updateName(){
            this.t_name.innerText = this.i_name.value = this.task.name
        }

        updateFinished(){
            this.i_checkbox.checked = this.task.finished
            this.root.toggleAttribute('finished', this.task.finished)

            this.t_date.classList.toggle('hide', !this.task.canShowDate)
            this.t_date.innerText = `Fini le ${dateToText(this.task.finishedAt)}`
        }

        updateRemoveOutline(){
            this.root.classList.toggle('removed', this.task.markedRemove == true)
        }

        updateAll(){
            this.updateId()
            this.updateName()
            this.updateFinished()
            this.updateRemoveOutline()
        }
        //#endregion

        refreshEditMode(){
            this.i_name.toggleAttribute('readonly', !isHardEdit())
            this.i_name.classList.toggle('hide', !isHardEdit())
            this.t_name.classList.toggle('hide', isHardEdit())
        }

        openContextMenu(e){
            openContextMenu(e.clientX, e.clientY, [
                {
                    label: this.task.markedRemove ? "Annuler la suppression" : "Supprimer",
                    action: () => {
                        this.task.markedRemove = !this.task.markedRemove
                        if(this.task.markedRemove) setEditMode(1)
                    }
                }
            ])
        }

    }

    class TaskVM extends AbstractTaskVM{

        constructor(root){
            super(root)
            this.t_counter = this.header.create('p.compteur')
            this.header.insertBefore(this.t_counter, this.i_checkbox)

            this.root.addEventListener('click', () => projectVM.openTask(this.task))
        }

        //#region Binding
        setupBindingFrom(){
            super.setupBindingFrom()
            this.task.watcher.listen('subtasks', 'vm', () => this.updateCounter())
        }

        updateCounter(){
            this.t_counter.innerText = this.task.subtasks.length ? 
                `${this.task.getDoneSubtasks()}/${this.task.subtasks.length}` : ''
        }

        updateAll(){
            super.updateAll()
            this.updateCounter()
        }
        //#endregion
    }

    class TaskLightBoxVM{

        #task = null

        constructor(root){
            this.root = root

            this.t_title = root.querySelector('#lb-tache-title')
            this.i_checkbox = root.querySelector('#lb-tache-finished')
            this.t_date = root.querySelector('#lb-tache-finishedAt')
            this.i_name = root.querySelector('#tache_nom')
            this.i_description = root.querySelector('#tache_description')
            this.t_created = root.querySelector("#tache_created")
            this.t_modified = root.querySelector("#tache_modified")
            this.d_tasks = root.querySelector('.taches')
            this.t_taskCounter = root.querySelector("#lb-taches-compteur")
            this.b_addSubTask = root.querySelector("#lb-taches-ajout")

            this.b_addSubTask.addEventListener('click', () => {
                if(isHardEdit()) this.createNewSubTask()
            })

            this.subtasksVM = []
            
            this.setupBindingTo()
        }
        
        get task(){
            return this.#task
        }
        
        set task(value){
            this.#task = value
            this.setupBindingFrom()
            this.updateAll()
        }
        
        //#region Binding
        setupBindingTo(){
            this.i_checkbox.addEventListener('change', e => this.task.finished = e.currentTarget.checked)
            this.i_name.addEventListener('change', e => this.task.name = e.currentTarget.value)
            this.i_description.addEventListener('change', e => this.task.description = e.currentTarget.value)
        }

        setupBindingFrom(){
            this.task.watcher.listen('finished', 'lb-vm', () => this.updateFinished())
            this.task.watcher.listen('subtasks', 'lb-vm', () => this.updateSubTaskVisuals())
        }

        removeBinding(){
            this.task.watcher.removeListeners('lb-vm')
        }

        updateId(){
            this.t_title.innerText = `Tâche #${this.task.id}`
        }

        updateName(){
            this.i_name.value = this.task.name
        }

        updateDescription(){
            this.i_description.value = this.task.description
        }

        updateDates(){
            this.t_created.innerText = dateToText(this.task.createdAt)
            this.t_modified.innerText = dateToText(this.task.modifiedAt)
        }

        updateFinished(){
            this.i_checkbox.checked = this.task.finished
            this.t_date.classList.toggle('hide', !this.task.canShowDate)
            this.t_date.innerText = `Fini le ${dateToText(this.task.finishedAt)}`
        }

        updateSubTaskVisuals(){
            let doneSubTasks = this.task.getDoneSubtasks()
            this.t_taskCounter.innerText = `(${doneSubTasks}/${this.task.subtasks.length})`
        }

        updateSubTasks(){
            this.subtasksVM.length = 0
            this.d_tasks.innerHTML = ''
            this.task.subtasks.forEach(task => this.addSubTask(task))
        }

        updateAll(){
            this.updateId()
            this.updateName()
            this.updateDescription()
            this.updateDates()
            this.updateFinished()
            this.updateSubTaskVisuals()
            this.updateSubTasks()
        }
        //#endregion

        addSubTask(subTask){
            let subTaskVM = new SubTaskVM(this.d_tasks)
            subTaskVM.task = subTask
            this.subtasksVM.push(subTaskVM)
            return subTaskVM
        }

        createNewSubTask(){
            let newSubTask = Watcher.toWatcherProxy(new SubTask(this.task))
            this.task.subtasks.push(newSubTask)
            
            newSubTask.id = `${this.task.id}.${this.task.subtasks.length}`
            newSubTask.name = `Sous-tâche ${newSubTask.id}`

            let vm = this.addSubTask(newSubTask)
            vm.root.classList.add('added')

            this.task.watcher.trigger('subtasks')
            this.updateSubTaskVisuals()
            vm.i_name.select()
        }

        refreshEditMode(){
            this.i_name.toggleAttribute('readonly', !isHardEdit())
            this.i_description.toggleAttribute('readonly', !isHardEdit())
            this.b_addSubTask.classList.toggle('hide', !isHardEdit())

            this.subtasksVM.forEach(vm => vm.refreshEditMode())
        }

    }

    class SubTaskVM extends AbstractTaskVM{

        constructor(root){
            super(root)
        }

        //#region Binding
        setupBindingFrom(){
            super.setupBindingFrom()
            this.task.watcher.listen('finished', 'subtask-vm', () => this.task.task.watcher.trigger('subtasks'))
        }
        //#endregion

    }
    //#endregion

    //#region Actions
    let projectVM = new ProjectVM(container)

    const floating_button = document.querySelector(".floating_button")
    const edit_button = document.querySelector("#edit-button")
    const default_buttons = floating_button.querySelector("#default-buttons")
    const checkbox_buttons = floating_button.querySelector("#checkbox-buttons")

    const cancel_button = default_buttons.querySelector("#cancel-button")
    const save_button = default_buttons.querySelector("#save-button")
    const checkbox_cancel_button = checkbox_buttons.querySelector("#checkbox-cancel-button")
    const checkbox_confirm_button = checkbox_buttons.querySelector("#checkbox-confirm-button")
    
    let editMode = null
    const isHardEdit = () => editMode == 1
    const isSoftEdit = () => editMode == 2

    function listenTaskCheckbox(task){
        task.watcher.listen('finished', 'change_listener', _ => {
            setEditMode(2)
            if(task instanceof Task) projectVM.updateTaskVisuals()
        })
    }
    
    function setEditMode(edit){
        if(edit == editMode) return
        if(edit == 2 && editMode == 1) return
        editMode = edit
        
        edit_button.classList.toggle('hide', isSoftEdit() || isHardEdit())
        default_buttons.classList.toggle('hide', !isHardEdit())
        checkbox_buttons.classList.toggle('hide', !isSoftEdit())

        projectVM.refreshEditMode()
    }

    function cancelChanges(){
        setupData()
        projectVM.project = project

        setEditMode(0)
    }
    
    function saveChanges(){
        updateProject()
            .then(() => loadProject())
            .then(() => {
                setEditMode(0)
            })
    }
    
    edit_button.addEventListener('click', () => setEditMode(1))
    cancel_button.addEventListener('click', () => cancelChanges())
    save_button.addEventListener('click', () => saveChanges())

    checkbox_cancel_button.addEventListener('click', () => cancelChanges())
    checkbox_confirm_button.addEventListener('click', () => saveChanges())
    //#endregion

    loadProject()
    setEditMode(0)
    floating_button.classList.remove('hide')
}