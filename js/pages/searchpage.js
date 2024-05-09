page_loads["searchpage"] = (args) => {

    let projects = null
    let projectIcons = new Map()

    const d_searchResults = container.querySelector("#search-results")

    class ProjectIconVM{

        #id = null

        constructor(root){
            this.root = root.create('div.preview-card')
            this.d_imageMask = this.root.create('div.image-mask')
            this.t_title = this.root.create('p.title')
            this.d_tags = this.root.create('div.etiquettes.c')

            this.img = this.d_imageMask.create('img')  

            this.root.addEventListener('click', () => {
                if(this.id) navigateTo("projectpage", {projectId: this.id})
            })

            this.root.addEventListener('contextmenu', (e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, [
                    {
                        label: "Supprimer le projet",
                        action: () => this.askDelete()
                    }
                ])
            })

            this.tagsVM = []
        }

        get id() { return this.#id }
        set id(value){
            this.#id = value
            this.updateAll()
        }

        get project(){
            return this.id ? projects.get(this.id) : null
        }

        //#region Update
        updateTitle(){
            this.t_title.innerText = this.project.title
        }

        updateTags(){
            this.tagsVM.length = 0
            this.d_tags.innerHTML = ''
            
            this.project.tags.forEach(tagId => {
                let tagVM = new TagVM(this.d_tags)
                this.tagsVM.push(tagVM)

                tagVM.tagId = tagId
                tagVM.update()
            })
        }

        updateAll(){
            this.updateTitle()
            this.updateTags()
        }
        //#endregion

        askDelete(){
            if(!this.id) return
            let fixedId = this.id

            deleteConfirmation(PROJECT_DELETE_MSG.format(this.project.title),
                () => { deleteProject(fixedId).then(() => this.deleteFromPage()) })
        }

        deleteFromPage(){
            this.root.remove()
            projectIcons.delete(this.id)
        }
    }

    function createProjectLB(){
        loadLightbox("create-project", {
            onOpen: () => {
                const i_titre = lightbox.querySelector("#lb-create-project-name")
                const b_create = lightbox.querySelector("#lb-create-project-new")

                b_create.addEventListener('click', () => {
                    let project = new Project()
                    project.title = i_titre.value

                    b_create.disabled = true
                    saveProject(project.toJSON())
                        .then(res => navigateTo("projectpage", {projectId: res}))
                        .catch(err => {
                            b_create.disabled = false
                        })
                })
            },
            backClose: true
        })
    }

    async function updateResults(){
        projects = await getProjects()
        await refreshTags()

        d_searchResults.innerHTML = ''
        projects.keys().forEach(projId => {
            if(!projectIcons.has(projId)){
                let projVM = new ProjectIconVM(d_searchResults)
                projectIcons.set(projId, projVM)
                projVM.id = projId
            }
            else projectIcons.get(projId).updateAll()
        })
    }

    const b_newProject = container.querySelector("#button-create-project")
    b_newProject.addEventListener('click', () => createProjectLB())

    pageEvents["tagsrefreshed"] = () => {
        projectIcons.values().forEach(vm => vm.updateTags())
    }

    updateResults()
}