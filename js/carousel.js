class Carousel{

    constructor(element){
        this.root = element
        this.build()
    }

    build(){
        this.images = {}
        this.selectedId = 1
        this.currentId = 0

        let currentImages = [...this.root.querySelectorAll("img")]
        this.root.innerHTML = ''

        this.projected = this.root.create('div.projected.image-mask')
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

    addImage({src, alt}, noRefresh){
        let id = ++this.currentId;

        let mask = this.imageMasks.create('div.image-mask')
        let image = mask.create('img')
        image.setAttribute('src', src)
        image.setAttribute('alt', alt)

        image.addEventListener('click', (e) => {
            this.selectedId = id
            this.refreshSelected()
        })

        this.images[id] = {
            mask: mask,
            image: image
        }

        if(!noRefresh) this.refreshSelected()
    }

    removeImage(id, noRefresh){
        this.images[id].mask.remove()
        delete this.images[id]

        if(id == this.selectedId) id = Object.keys(this.images)[0]
        if(!noRefresh) this.refreshSelected()
    }

    refreshSelected(){
        for(let k in this.images){
            let image = this.images[k].image

            if(k == this.selectedId){
                image.setAttribute('selected', true)
                this.projectedImage.setAttribute('src', image.getAttribute('src'))
                this.projectedImage.setAttribute('alt', image.getAttribute('alt'))
            }
            else image.removeAttribute('selected')
        }
    }

}