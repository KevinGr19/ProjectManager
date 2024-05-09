page_loads["projectpage"] = (args) => {

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

        // Tasks
        project.tasks = project.tasks.filter(t => !t.markedRemove)
        project.tasks.forEach((t,i) => {
            let oldTask = original_project.tasks.find(_t => _t.id == t.id)

            if(!t.createdAt)
                t.createdAt = new Date()

            t.subtasks = t.subtasks.filter(st => !st.markedRemove)
            t.processChanges(oldTask)
            t.id = i+1

            t.subtasks.forEach((st, j) => {
                if(!st.createdAt)
                    st.createdAt = new Date()

                if(oldTask){
                    let oldSubTask = oldTask.subtasks.find(_st => _st.id == st.id)
                    st.processChanges(oldSubTask)

                    if(oldSubTask && st.isModified(oldSubTask))
                        t.modifiedAt = new Date()
                }
                else st.processChanges(null)

                st.id = `${t.id}.${j+1}`
            })
        })

        // Save images
        for(let file of projectVM.carouselVM.imagesToAdd.values()){
            let imgId = await saveImage(file)
            project.images.add(imgId)
        }

        // Save project
        let json = project.toJSON()
        await saveProject(json, args.projectId)
    }

    async function loadProject(){
        let json = await getProject(args.projectId)
        original_project = Project.fromJSON(json)
        await refreshTags()

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
            this.b_manageTags = root.querySelector("#manage-tags")
            this.d_progressBar = root.querySelector("#progressbar")
            this.t_progressBar = root.querySelector("#text-progressbar")
            this.d_progressFill = this.d_progressBar.querySelector("span")
            this.d_tasks = root.querySelector("#taches-projet")
            this.d_carousel = root.querySelector("#projet-carousel")
            this.b_deleteProject = root.querySelector("#button-delete-project")

            this.t_noTags = this.d_tags.create('p>Aucune')

            this.b_addTask.addEventListener('click', () => {
                if(isHardEdit()) this.createNewTask()
            })

            this.b_manageTags.addEventListener('click', () => this.openTags())

            this.d_tasks.addEventListener('dragover', e => {
                let draggedVM = this.tasksVM.find(vm => vm.dragged)
                if(!draggedVM) return
                e.preventDefault()

                let after = getElementAfterDragged(this.d_tasks, e.clientY)
                if(after) this.d_tasks.insertBefore(draggedVM.root, after)
                else this.d_tasks.appendChild(draggedVM.root)
            })

            this.b_deleteProject.addEventListener('click', () => {
                let fixedId = args.projectId
                deleteConfirmation(`Êtes-vous sûr de vouloir supprimer le projet "<b>${this.project.title}</b>" ?
                    <br><br>L'action est irréversible !`,
                    () => { deleteProject(fixedId).then(() => goHome()) })
            })

            this.tasksVM = []
            this.tagsVM = new Map()

            this.carouselVM = new CarouselVM(this.d_carousel)
            this.carouselVM.canDelete = () => !isSoftEdit()
            this.carouselVM.deleteCallback = () => setEditMode(1)

            this.lightboxTaskVM = null
            this.lightboxTagsVM = null

            this.setupBindingTo()
        }

        get project(){
            return this.#project
        }

        set project(value){
            this.#project = value
            this.carouselVM.images = this.project.images

            this.setupBindingFrom()
            this.updateAll()
            this.refreshTaskLightbox()
            this.refreshTagsLightbox()
        }

        //#region Binding
        setupBindingTo(){
            this.i_title.addEventListener('change', e => this.project.title = e.currentTarget.value)
            this.i_description.addEventListener('change', e => this.project.description = e.currentTarget.value)
        }

        setupBindingFrom(){
            this.project.watcher.listen('title', 'vm', () => this.updateTitle())
            this.project.watcher.listen('description', 'vm', () => this.updateDescription())
            this.project.watcher.listen('tags', 'vm', () => this.updateTags())
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
            this.tagsVM.values().forEach(vm => {
                if(!this.project.tags.has(vm.tagId)){
                    vm.root.remove()
                    this.tagsVM.delete(vm.tagId)
                }
            })

            this.project.tags.forEach(id => {
                if(!this.tagsVM.has(id)){
                    this.tagsVM.set(id, new TagVM(this.d_tags))
                    this.tagsVM.get(id).tagId = id
                }
                else this.d_tags.appendChild(this.tagsVM.get(id).root)

                this.tagsVM.get(id).update()
            })

            this.t_noTags.classList.toggle('hide', this.tagsVM.size)
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

            this.carouselVM.setEditMode(isHardEdit())
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

            taskVM.dragged = false
            taskVM.root.addEventListener('dragstart', e => {
                taskVM.dragged = true
                taskVM.root.classList.add("dragging")
            })

            taskVM.root.addEventListener('dragend', e => {
                this.tasksVM = [...this.d_tasks.children].map(r => r.vm).filter(vm => vm)
                this.project.tasks = this.tasksVM.map(vm => vm.task)

                taskVM.dragged = false
                taskVM.root.classList.remove("dragging")
            })

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

        refreshTaskLightbox(){
            if(!this.lightboxTaskVM) return

            let task = this.project.tasks.find(t => t.id == this.lightboxTaskVM.task.id)
            if(task) this.lightboxTaskVM.task = task
            else closeLightbox()
        }

        openTags(){
            if(!this.lightboxTagsVM){
                loadLightbox("tag-lightbox", {
                    onOpen: () => {
                        this.lightboxTagsVM = new TagsLightboxVM(lightbox)
                        this.lightboxTagsVM.project = this.project
                    },
                    onClose: () => {
                        this.lightboxTagsVM.removeBinding()
                        this.lightboxTagsVM = null
                    }
                })
            }
        }

        refreshTagsLightbox(){
            if(!this.lightboxTagsVM) return
            this.lightboxTagsVM.project = this.project
        }
    }

    class AbstractTaskVM{

        #task = null

        constructor(root){
            this.root = root.create('div.tache')
            this.root.vm = this

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

            setUndraggable(this.i_name)
            setUndraggable(this.i_checkbox)

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
            this.root.setAttribute('draggable', isHardEdit())

            this.i_name.toggleAttribute('readonly', !isHardEdit())
            this.i_name.classList.toggle('hide', !isHardEdit())
            this.t_name.classList.toggle('hide', isHardEdit())
        }

        openContextMenu(e){
            if(isSoftEdit()) return // Pas de suppression en Soft Edit
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

            this.d_tasks.addEventListener('dragover', e => {
                let draggedVM = this.subtasksVM.find(vm => vm.dragged)
                if(!draggedVM) return
                e.preventDefault()

                let after = getElementAfterDragged(this.d_tasks, e.clientY)
                if(after) this.d_tasks.insertBefore(draggedVM.root, after)
                else this.d_tasks.appendChild(draggedVM.root)
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

            subTaskVM.root.addEventListener('dragstart', e => {
                subTaskVM.dragged = true
                subTaskVM.root.classList.add("dragging")
            })

            subTaskVM.root.addEventListener('dragend', e => {
                this.subtasksVM = [...this.d_tasks.children].map(r => r.vm).filter(vm => vm)
                this.task.subtasks = this.subtasksVM.map(vm => vm.task)
                
                subTaskVM.dragged = false
                subTaskVM.root.classList.remove("dragging")
            })

            this.subtasksVM.push(subTaskVM)
            return subTaskVM
        }

        createNewSubTask(){
            let newSubTask = Watcher.toWatcherProxy(new SubTask(this.task))
            this.task.subtasks.push(newSubTask)
            
            newSubTask.id = `${this.task.id}.${this.task.subtasks.length}`
            newSubTask.name = `Sous-tâche ${newSubTask.id}`

            let taskVM = this.addSubTask(newSubTask)
            taskVM.root.classList.add('added')

            this.task.watcher.trigger('subtasks')
            this.updateSubTaskVisuals()
            taskVM.i_name.select()
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

    class TagsLightboxVM{

        #project = null

        constructor(root){
            this.root = root

            this.d_projectTags = this.root.querySelector("#lb-project-tags")
            this.d_otherTags = this.root.querySelector("#lb-other-tags")
            this.b_newTag = this.root.querySelector("#lb-tag-new")

            this.b_newTag.addEventListener('click', () => editTagLB())

            this.tagsVM = new Map()

            this.setupBindingTo()
        }

        get project(){
            return this.#project
        }

        set project(value){
            this.#project = value
            this.setupBindingFrom()
            this.updateAll()
        }

        //#region Binding
        setupBindingTo(){

        }

        setupBindingFrom(){
            this.project.watcher.listen('tags', 'lb-vm', () => this.updateAll())
        }

        removeBinding(){
            this.project.watcher.removeListeners('lb-vm')
        }

        updateAll(){
            this.tagsVM.values().forEach(tagVM => {
                if(!this.project.tags.has(tagVM.tagId)){
                    tagVM.root.remove()
                    this.tagsVM.delete(tagVM.tagId)
                }
            })

            tags.keys().forEach(id => {
                if(!this.project.tags.has(id)) this.updateTag(id)
            })
            this.project.tags.forEach(id => this.updateTag(id))
        }
        //#endregion

        updateTag(id){
            if(!this.tagsVM.has(id)){
                let tagVM = new TagVM(this.d_otherTags)
                this.tagsVM.set(id, tagVM)
                tagVM.tagId = id
                tagVM.root.classList.add('clickable')
                tagVM.root.addEventListener('click', () => this.swapTag(tagVM.tagId))
            }

            let newRoot = this.project.tags.has(id) ? this.d_projectTags : this.d_otherTags
            newRoot.appendChild(this.tagsVM.get(id).root)

            this.tagsVM.get(id).update()
        }

        swapTag(id){
            if(isSoftEdit()) return

            if(this.project.tags.has(id)) this.project.tags.delete(id)
            else this.project.tags.add(id)

            setEditMode(1)
            this.project.watcher.trigger('tags')
        }

    }
    //#endregion

    //#region Actions
    let projectVM = new ProjectVM(container)

    const floating_button = document.querySelector("#projet-floating-buttons")
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

    pageEvents["tagsrefreshed"] = () => {
        // Filtering unreferenced tags
        if(!original_project) return
        original_project.tags = new Set(original_project.tags.keys().filter(tagId => tags.has(tagId)))

        if(!project) return
        project.tags = new Set(project.tags.keys().filter(tagId => tags.has(tagId)))

        // Updating tags visuals
        projectVM.updateTags()
        if(projectVM.lightboxTagsVM) projectVM.lightboxTagsVM.updateAll()
    }
    
    loadProject()
    setEditMode(0)
    floating_button.classList.remove('hide')

    refreshTags()
}