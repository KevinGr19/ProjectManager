page_loads["projectpage"] = () => {

    // document.querySelectorAll(".tache").forEach(t => {
    //     t.addEventListener('click', () => showLightbox())
    //     t.querySelector("input[type=checkbox]").addEventListener('click', e => {
    //         e.stopPropagation()
    //     })
    // })

    //#region Fake data
    // Fake project
    let project = new Project()
    project.title = "FPS Multijoueur Unity"
    project.description = "Ceci est la description du projet Unity.\nUne deuxième ligne ici."
    project.createdAt = new Date(2024, 3, 25, 16, 34)
    project.modifiedAt = new Date(2024, 3, 27, 10, 34)
    project.images.push("https://unity.com/sites/default/files/styles/810_scale_width/public/2023-01/8-5%20GraphicsBuffersTower%20VFX.jpg?itok=FXoowMCi")
    project.images.push("https://docs.blender.org/manual/en/latest/_images/modeling_meshes_primitives_all.png")

    // Fake tags
    project.tags.push(new Tag("Unity", "black"))
    project.tags.push(new Tag("C#", "green"))
    project.tags.push(new Tag("Networking", "dodgerblue"))
    project.tags.push(new Tag("Maths", "darkorange"))

    // Fake tasks
    let task = new Task(project)
    task.id = 1
    task.name = "Créer le projet Unity"
    task.description = "Description 1"
    task.createdAt = new Date(2024, 3, 25, 17, 10)
    task.modifiedAt = new Date(2024, 3, 28, 10, 3)
    task.finished = true
    task.finishedAt = new Date(2024, 3, 28, 11, 2)

    task = new Task(project)
    task.id = 2
    task.name = "Modéliser et animer les personnages et ennemis"
    task.description = "Description 2"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false

    task = new Task(project)
    task.id = 3
    task.name = "Programmer le CharacterController"
    task.description = "Description 3"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false
    task.finishedAt = new Date(2024, 3, 28, 12, 25)
    //#endregion

    //#region Wiring up
    const i_projectTitle = document.querySelector("#titre-projet")
    const i_projectDescription = document.querySelector("#description-projet")
    const d_projectEtiquettes = document.querySelector("#etiquettes-projet")
    const t_projectCreated = document.querySelector("#created-projet")
    const t_projectModified = document.querySelector("#modified-projet")

    const d_progressbar = document.querySelector("#progressbar")
    const d_progressbarFill = d_progressbar.querySelector("span")
    const t_progressbar = document.querySelector("#text-progressbar")

    const d_taches = document.querySelector("#taches-projet")

    function updateProgressbar(){
        let ratio = project.getRatio()
        if(ratio === null){
            d_progressbar.classList.add('hide')
        }
        else{
            d_progressbar.classList.remove('hide')
            
            let percentage = Math.round(ratio * 100)
            t_progressbar.innerText = d_progressbarFill.style.width = `${percentage}%`
        }
    }

    function updateProject(){
        i_projectTitle.value = project.title
        i_projectDescription.value = project.description
        t_projectCreated.innerText = dateToText(project.createdAt)
        t_projectModified.innerText = dateToText(project.modifiedAt)

        d_projectEtiquettes.innerHTML = ''
        if(project.tags){
            project.tags.forEach(t => d_projectEtiquettes.appendChild(t.toHTML()))
        }
        else{
            d_projectEtiquettes.innerText = 'Aucune'
        }

        d_taches.innerHTML = ''
        if(!project.tasks) d_taches.innerText = "Ce projet n'a aucune tâche."
        else project.tasks.forEach(t => {
            d_taches.appendChild(t.toHTML())
        })

        updateProgressbar()
    }

    updateProject()
    //#endregion

    //#region Floating buttons
    const floating_button = document.querySelector(".floating_button")
    const edit_button = floating_button.querySelector("#edit-button")
    const cancel_button = floating_button.querySelector("#cancel-button")
    const save_button = floating_button.querySelector("#save-button")

    let editMode = null

    function setEditMode(edit){
        if(edit == editMode) return
        editMode = edit

        edit_button.classList.toggle('hide', editMode)
        cancel_button.classList.toggle('hide', !editMode)
        save_button.classList.toggle('hide', !editMode)

        if(editMode){
            i_projectTitle.removeAttribute('readonly')
            i_projectDescription.removeAttribute('readonly')
        }

        else{
            i_projectTitle.setAttribute('readonly', true)
            i_projectDescription.setAttribute('readonly', true)
            updateProject()
        }
    }

    async function saveAll(){
        let modifiedAt = new Date()

        project.modifiedAt = modifiedAt
        
        updateProject()
        setEditMode(false)
    }

    edit_button.addEventListener('click', () => setEditMode(true))
    cancel_button.addEventListener('click', () => setEditMode(false))
    save_button.addEventListener('click', () => saveAll())

    setEditMode(false)
    floating_button.classList.remove('hide')
    //#endregion
}