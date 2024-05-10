class Carousel{

    constructor(element){
        this.root = element
        this.build()
    }

    build(){
        this.images = {}
        this.selectedId = 1

        let currentImages = [...this.root.querySelectorAll("img")]
        this.root.innerHTML = ''

        this.projected = this.root.create('div.projected.image-mask')
        this.t_noImage = this.root.create('p.comment.fw>Aucune image.')
        this.imageMasks = this.root.create('div.images')

        this.projectedImage = this.projected.create('img')

        currentImages.forEach(i => {
            this.addImage({
                src: i.getAttribute('src'),
                alt: i.getAttribute('alt'),
            }, true)
        });

        this.root.classList.add('ready')
        this.refreshSelected()
    }

    addBlankImage(){
        return this.addImage({src: null, alt: null})
    }

    addImage({src, alt}){
        let id = Object.keys(this.images).length + 1;

        let mask = this.imageMasks.create('div.image-mask')
        let image = mask.create('img')
        image.carouselId = id

        if(src) image.setAttribute('src', src)
        if(alt) image.setAttribute('alt', alt)

        image.addEventListener('click', (e) => {
            this.selectedId = id
            this.refreshSelected()
        })

        this.images[id] = {
            mask: mask,
            image: image
        }

        return image
    }

    removeImage(id){
        this.images[id].mask.remove()
        delete this.images[id]

        if(id == this.selectedId){
            this.selectedId = Object.keys(this.images)[0] ?? id
            this.refreshIfProjected(this.selectedId)
        }
    }

    clear(){
        for(let k in this.images){
            this.images[k].image.remove()
            delete this.images[k]
        }

        this.imageMasks.innerHTML = ''
        this.refreshIfProjected()
    }

    refreshSelected(){
        for(let k in this.images){
            let image = this.images[k].image
            image.toggleAttribute('selected', k == this.selectedId)
        }

        this.refreshIfProjected(this.selectedId)
    }

    refreshIfProjected(id){
        if(!Object.keys(this.images).length){
            this.projectedImage.removeAttribute('src')
            this.projectedImage.removeAttribute('alt')

            this.projected.classList.add('hide')
            this.t_noImage.classList.remove('hide')
        }
        else{
            this.projected.classList.remove('hide')
            this.t_noImage.classList.add('hide')

            if(this.selectedId == id && this.images[id]){
                let image = this.images[id].image
                let src = image.getAttribute('src')
                let alt = image.getAttribute('alt')
    
                if(src) this.projectedImage.setAttribute('src', src)
                else this.projectedImage.removeAttribute('src')
    
                if(alt) this.projectedImage.setAttribute('alt', alt)
                else this.projectedImage.removeAttribute('alt')
            }
        }
    }

    select(id){
        this.selectedId = id
        this.refreshSelected()
    }

}

class CarouselVM{

    #images = null

    constructor(root){
        this.root = root
        this.carouselRoot = root.querySelector("carousel")
        this.carousel = new Carousel(this.carouselRoot)
        this.imagesToAdd = new Map()

        this.d_addimage = this.root.querySelector('.addimage')
        this.i_addimagefile = this.d_addimage.querySelector('input[type=file]')
        this.b_addimageurl = this.d_addimage.querySelector(".addimageurl")

        this.carousel.projectedImage.addEventListener('click', () => {
            const src = this.carousel.projectedImage.getAttribute('src')
            if(!src) return

            loadLightbox("image-detail", {
                onOpen: () => {
                    const img = lightbox.querySelector("img")
                    img.setAttribute('src', src)
                },
                backClose: true,
                noScroll: true
            })
        })

        this.i_addimagefile.addEventListener('change', (e) => {
            const files = e.currentTarget.files
            for(let file of files) this.addImageByFile(file)
        })

        this.b_addimageurl.addEventListener('click', () => {
            loadLightbox("add-image-url", {
                onOpen: () => {
                    const i_url = lightbox.querySelector("#lb-add-image-url-input")
                    const b_save = lightbox.querySelector("#lb-add-image-url-save")

                    b_save.addEventListener('click', () => {
                        this.addImageByURL(i_url.value)
                        backLightbox()
                    })
                },
                backClose: true
            })
        })

        this.canDelete = () => true
        this.deleteCallback = () => {}

        this.setEditMode(false)
    }

    get images() { return this.#images }
    set images(value){
        if(this.images){
            this.imagesToAdd.keys().forEach(url => URL.revokeObjectURL(url))
            this.imagesToAdd.clear()
        }
        this.#images = value
        this.updateAll()
    }

    updateAll(){
        this.carousel.clear()
        if(!this.images){
            this.carousel.refreshSelected()
            return
        }

        this.images.forEach(token => {
            let img = this.carousel.addBlankImage()
            if(typeof token === 'string'){
                img.setAttribute('src', token)
                this.carousel.refreshIfProjected(img.carouselId)
            }
            else{
                getImageURL(token).then((res) => {
                    if(res) img.setAttribute('src', res)
                    this.carousel.refreshIfProjected(img.carouselId)
                })
            }

            this.addContextMenuListener(img, token)
        })

        this.imagesToAdd.keys().forEach(url => {
            let img = this.carousel.addImage({src: url})
            this.addContextMenuListener(img)
        })

        this.carousel.refreshSelected()
    }

    addContextMenuListener(img, token){
        img.addEventListener('contextmenu', (e) => {
            if(!this.canDelete()) return
            e.preventDefault()

            openContextMenu(e.clientX, e.clientY, [
                {
                    label: "Supprimer l'image",
                    action: () => {
                        if(!this.canDelete()) return
                        this.carousel.removeImage(img.carouselId)
                        this.images.delete(token)
                        this.imagesToAdd.delete(token)
                        this.deleteCallback()
                    }
                }
            ])
        })
    }

    addImageByFile(file){
        let url = URL.createObjectURL(file)
        this.imagesToAdd.set(url, file)
        this.addImage(url)
    }

    addImageByURL(url){
        if(this.images.has(url)) return

        this.images.add(url)
        this.addImage(url)
    }

    addImage(url){
        let img = this.carousel.addImage({src: url})
        this.carousel.select(img.carouselId)
        this.addContextMenuListener(img, url)
    }

    setEditMode(mode){
        this.d_addimage.classList.toggle('hide', !mode)
        this.editMode = mode
    }

}

class TagVM{

    #tagId = null

    constructor(root){
        this.root = root.create('div.etiquette')
        this.t_name = this.root.create('p')

        this.root.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if(!this.tag) return

            this.openContextMenu(e)
        })
    }

    get tagId(){
        return this.#tagId
    }

    set tagId(value){
        this.#tagId = value
    }

    get tag(){
        return tags.get(this.tagId)
    }

    update(){
        this.root.style.backgroundColor = this.tag ? this.tag.color : 'black'
        this.t_name.innerText = this.tag ? this.tag.name : '...'
    }

    openContextMenu(e){
        openContextMenu(e.clientX, e.clientY, [
            {
                label: "Modifier l'étiquette",
                action: () => {
                    if(this.tag) editTagLB(this.tagId)
                }
            },
            {
                label: "Supprimer l'étiquette",
                action: () => {
                    if(!this.tag) return
                    let fixedId = this.tagId
                    deleteConfirmation(
                        TAG_DELETE_MSG.format(this.tag.name),
                        () => deleteTag(fixedId).then(() => refreshTags())
                    )
                }
            }
        ])
    }
}