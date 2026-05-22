import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

const panel = document.getElementById('right-panel')
const canvas = document.getElementById('archive-canvas')

// ── renderer ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(panel.clientWidth, panel.clientHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// ── scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = null

// ── camera ─────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, panel.clientWidth / panel.clientHeight, 0.1, 1000)
camera.position.z = 20

// ── orbit controls ─────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.autoRotate = true
controls.autoRotateSpeed = 2.2
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.enablePan = true
controls.enableZoom = true
controls.zoomSpeed = -0.5
controls.rotateSpeed = 0.5
controls.minDistance = 4
controls.maxDistance = 20

controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
}

// ── smooth camera movement ─────────────────────────────────────────────────
const cameraTargetPos = new THREE.Vector3(0, 0, 20)
const controlsTargetPos = new THREE.Vector3(0, 0, 0)
const LERP_SPEED = 0.05
let isNavigating = false

// ── one-finger orbit ───────────────────────────────────────────────────────
let lastX = null
let lastY = null
const ROTATE_SPEED = 0.003

canvas.addEventListener('pointermove', e => {
  if (e.buttons !== 0) return
  isNavigating = false

  if (lastX === null) {
    lastX = e.clientX
    lastY = e.clientY
    return
  }

  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY

  const spherical = new THREE.Spherical()
  spherical.setFromVector3(camera.position.clone().sub(controls.target))
  spherical.theta -= dx * ROTATE_SPEED
  spherical.phi -= dy * ROTATE_SPEED
  spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

  const newPos = new THREE.Vector3()
    .setFromSpherical(spherical)
    .add(controls.target)
  camera.position.copy(newPos)
  controls.update()
})

canvas.addEventListener('pointerleave', () => { lastX = null; lastY = null })
canvas.addEventListener('pointerenter', () => { lastX = null; lastY = null })

// ── layer config ──────────────────────────────────────────────────────────
const layers = {
  '1': { label: 'Boats', description: 'Vessels, crossings, the sea.', video: 'videos/1.mp4', lineColor: 0xffffff },
  '2': { label: 'Archive', description: 'Photographs, documents, memory.', video: 'videos/2.mp4', lineColor: 0xffffff },
  '3': { label: 'Landscape', description: 'Coast, horizon, land.', video: 'videos/3.mp4', lineColor: 0xffffff },
  '4': { label: 'Human', description: 'Faces, hands, figures.', video: 'videos/4.mp4', lineColor: 0xffffff },
  '5': { label: 'Time', description: 'Past and present, layered.', video: 'videos/5.mp4', lineColor: 0xffffff },
}

// ── meshes ─────────────────────────────────────────────────────────────────
const meshes = []
const loader = new THREE.TextureLoader()

// ── load images from metadata ──────────────────────────────────────────────
fetch('/images/metadata.json')
  .then(r => r.json())
  .then(metadata => {
    Object.entries(metadata).forEach(([layerKey, files]) => {
      Object.entries(files).forEach(([filename, meta]) => {
        const src = `/images/${layerKey}/${filename}`
        loader.load(src, texture => {
          const aspect = texture.image.width / texture.image.height
          const width = 1.5 + Math.random() * 1.5
          const height = width / aspect

          const geometry = new THREE.PlaneGeometry(width, height)
          const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1 })
          const mesh = new THREE.Mesh(geometry, material)

          mesh.position.x = (Math.random() - 0.5) * 10
          mesh.position.y = (Math.random() - 0.5) * 20
          mesh.position.z = (Math.random() - 0.5) * 9

          mesh.userData.layer = layerKey
          mesh.userData.title = meta?.title ?? ''
          mesh.userData.description = meta?.description ?? ''

          scene.add(mesh)
          meshes.push(mesh)
        })
      })
    })
  })
  .catch(err => console.warn('Could not load metadata.json', err))

// ── video ──────────────────────────────────────────────────────────────────
const video = document.getElementById('main-video')
const videoSource = document.getElementById('video-source')
const subtitleVideo = document.getElementById('subtitle-video')
const subtitleSource = document.getElementById('subtitle-source')
const subtitleText = document.getElementById('subtitle-text')

function switchVideo(src) {
  videoSource.src = src
  video.muted = false
  video.load()
  video.play()
}

// ── keep subtitle video in sync with main video loop ───────────────────────
video.addEventListener('timeupdate', () => {
  if (video.duration && video.currentTime > video.duration - 0.3) {
    subtitleVideo.currentTime = 0
    subtitleVideo.play()
  }
})

// ── intro typing animation ─────────────────────────────────────────────────
const subtitleCurrent = document.getElementById('subtitle-current')
const subtitleNext = document.getElementById('subtitle-next')

const line1 = 'Landfall: A five-part documentary and interactive archive.'
const line2 = 'press a chapter to begin · use the trackpad and arrows to explore'

function typeText(element, text, speed = 40) {
  return new Promise(resolve => {
    element.textContent = ''
    let i = 0
    const interval = setInterval(() => {
      element.textContent += text[i]
      i++
      if (i >= text.length) {
        clearInterval(interval)
        resolve()
      }
    }, speed)
  })
}

let introPlaying = false

async function playIntro() {
  if (introPlaying) return
  introPlaying = true
  subtitleNext.textContent = ''
  subtitleCurrent.textContent = ''
  await typeText(subtitleCurrent, line1, 40)
  await new Promise(r => setTimeout(r, 2000))
  await typeText(subtitleNext, line2, 30)
  introPlaying = false
}

playIntro()

// ── header description ─────────────────────────────────────────────────────
const headerDesc = document.getElementById('header-desc')
let activeLayer = null

function showPlaneInfo(userData) {
  if (!activeLayer) return
  if (!userData.title && !userData.description) return
  headerDesc.innerHTML = `
    <span style="font-style:normal; font-weight:normal; text-transform:uppercase; color: #4a779f">${userData.title}</span>
    <span style="margin-left: auto; padding-left: 24px; font-style:italic; color: #f04b26">${userData.description}</span>
  `
  headerDesc.style.display = 'flex'
  headerDesc.style.justifyContent = 'space-between'
  headerDesc.style.opacity = '1'
}

function hidePlaneInfo() {
  headerDesc.style.opacity = '0'
}

// ── raycaster ─────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let currentHoveredMesh = null

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  const visible = meshes.filter(m => m.visible)
  visible.forEach(m => m.updateWorldMatrix(true, false))

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(visible)

  if (intersects.length > 0) {
    currentHoveredMesh = intersects[0].object
    showPlaneInfo(currentHoveredMesh.userData)
  } else {
    currentHoveredMesh = null
    hidePlaneInfo()
  }
})

canvas.addEventListener('mouseleave', () => {
  currentHoveredMesh = null
  hidePlaneInfo()
})

// ── double click to reset camera ──────────────────────────────────────────
canvas.addEventListener('dblclick', () => {
  cameraTargetPos.set(0, 0, 20)
  controlsTargetPos.set(0, 0, 0)
  isNavigating = true
})

// ── slideshow via left/right click ────────────────────────────────────────
let slideshowIndex = -1
let slideshowMeshes = []

function zoomToMesh(mesh) {
  const target = new THREE.Vector3()
  mesh.getWorldPosition(target)
  cameraTargetPos.copy(target).add(new THREE.Vector3(0, 0, 3))
  controlsTargetPos.copy(target)
  isNavigating = true
  showPlaneInfo(mesh.userData)
}

canvas.addEventListener('contextmenu', e => e.preventDefault())

canvas.addEventListener('mousedown', e => {
  if (!e.isTrusted) return
  if (slideshowMeshes.length === 0) return

  if (e.button === 0) {
    slideshowIndex = (slideshowIndex - 1 + slideshowMeshes.length) % slideshowMeshes.length
    zoomToMesh(slideshowMeshes[slideshowIndex])
  }

  if (e.button === 2) {
    slideshowIndex = (slideshowIndex + 1) % slideshowMeshes.length
    zoomToMesh(slideshowMeshes[slideshowIndex])
  }
})

// ── connection lines ───────────────────────────────────────────────────────
let connectionLines = null
const DISTANCE_THRESHOLD = 5

function buildPositionArray(visibleMeshes) {
  const positions = []
  for (let i = 0; i < visibleMeshes.length; i++) {
    for (let j = i + 1; j < visibleMeshes.length; j++) {
      visibleMeshes[i].updateWorldMatrix(true, false)
      visibleMeshes[j].updateWorldMatrix(true, false)
      const a = new THREE.Vector3()
      const b = new THREE.Vector3()
      visibleMeshes[i].getWorldPosition(a)
      visibleMeshes[j].getWorldPosition(b)
      if (a.distanceTo(b) < DISTANCE_THRESHOLD) {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
  }
  return positions
}

function createConnectionLines(visibleMeshes, lineColor = 0xffffff) {
  removeConnectionLines()
  const positions = buildPositionArray(visibleMeshes)
  if (positions.length === 0) return

  const geometry = new LineGeometry()
  geometry.setPositions(positions)

  const material = new LineMaterial({
    color: lineColor,
    linewidth: 1,
    transparent: true,
    opacity: 0.4,
    resolution: new THREE.Vector2(panel.clientWidth, panel.clientHeight),
    dashed: false,
  })

  connectionLines = new Line2(geometry, material)
  connectionLines.userData.sourceMeshes = visibleMeshes
  scene.add(connectionLines)
}

function removeConnectionLines() {
  if (connectionLines) {
    connectionLines.geometry.dispose()
    connectionLines.material.dispose()
    scene.remove(connectionLines)
    connectionLines = null
  }
}

function updateConnectionLines() {
  if (!connectionLines) return
  const sourceMeshes = connectionLines.userData.sourceMeshes
  const positions = buildPositionArray(sourceMeshes)
  connectionLines.geometry.dispose()
  const geometry = new LineGeometry()
  if (positions.length > 0) geometry.setPositions(positions)
  connectionLines.geometry = geometry
}

// ── layer switching ────────────────────────────────────────────────────────
function activateLayer(key) {
  activeLayer = key
  subtitleText.style.display = 'none'
  subtitleSource.src = `videos/subtitle_${key}.mp4`
  subtitleVideo.style.display = 'block'
  subtitleVideo.load()
  subtitleVideo.play()
  controls.autoRotate = false
  meshes.forEach(mesh => { mesh.visible = mesh.userData.layer === key })
  const layer = layers[key]
  switchVideo(layer.video)
  const visibleMeshes = meshes.filter(m => m.userData.layer === key)
  createConnectionLines(visibleMeshes, layer.lineColor)
  slideshowMeshes = visibleMeshes
  slideshowIndex = -1
  cameraTargetPos.set(0, 0, 20)
  controlsTargetPos.set(0, 0, 0)
  isNavigating = true
}

function resetLayers() {
  activeLayer = null
  subtitleVideo.style.display = 'none'
  subtitleVideo.pause()
  subtitleText.style.display = 'flex'
  video.muted = true
  controls.autoRotate = true
  meshes.forEach(mesh => { mesh.visible = true })
  hidePlaneInfo()
  removeConnectionLines()
  switchVideo('videos/loading_noText.mp4')
  slideshowMeshes = []
  slideshowIndex = -1
  cameraTargetPos.set(0, 0, 20)
  controlsTargetPos.set(0, 0, 0)
  isNavigating = true
  playIntro()
}

// ── keyboard input ─────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === '0') resetLayers()
  else if (layers[e.key]) activateLayer(e.key)
})

// ── resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = panel.clientWidth / panel.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(panel.clientWidth, panel.clientHeight)
  if (connectionLines) {
    connectionLines.material.resolution.set(panel.clientWidth, panel.clientHeight)
  }
})

// ── animation loop ─────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)

  if (isNavigating) {
    camera.position.lerp(cameraTargetPos, LERP_SPEED)
    controls.target.lerp(controlsTargetPos, LERP_SPEED)
    if (camera.position.distanceTo(cameraTargetPos) < 0.05) {
      camera.position.copy(cameraTargetPos)
      controls.target.copy(controlsTargetPos)
      isNavigating = false
    }
  }

  controls.update()

  scene.children.forEach(child => {
    if (child !== connectionLines) child.quaternion.copy(camera.quaternion)
  })

  updateConnectionLines()
  renderer.render(scene, camera)
}

animate()