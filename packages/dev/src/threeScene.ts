import { Project, Scene3D, PhysicsLoader, ExtendedObject3D, THREE } from 'enable3d'
import { SpotLight, SpotLightHelper, PointLight, DirectionalLight } from '../../threeWrapper/dist'

var debugWheels = false
var material = { lambert: { transparent: true, opacity: 0.75 } }

class MainScene extends Scene3D {
  keys = {
    w: false,
    a: false,
    s: false,
    d: false
  }
  car: any
  axis: Ammo.btHingeConstraint
  light: DirectionalLight

  preload() {
    this.load.preload('grass', '/assets/grass.jpg')
  }

  addWheel(x: number, z: number) {
    const y = debugWheels ? 3 : 1
    const wheel = this.add.cylinder(
      { mass: 25, radiusBottom: 0.5, radiusTop: 0.5, radiusSegments: 24, height: 0.35, x, y, z },
      material
    )

    wheel.rotateZ(Math.PI / 2)
    // @ts-ignore
    // this.physics.add.existing(wheel, { shape: 'convex' })
    this.physics.add.existing(wheel)
    wheel.body.setFriction(1)
    return wheel
  }

  addBody() {
    const box = this.add.box({ y: 1.5, width: 1.75, depth: 3.65, mass: 500 }, material)
    this.physics.add.existing(box, { collisionFlags: 4 })
    return box
  }

  addAxis(z: number) {
    const y = debugWheels ? 3 : 1
    const box = this.add.box({ mass: 50, x: 0, y, z, height: 0.25, width: 1.75, depth: 0.25 }, material)
    this.physics.add.existing(box)
    return box
  }

  async create() {
    // this.warpSpeed()

    const { lights } = await this.warpSpeed('-ground')
    const light = lights?.directionalLight
    if (light) {
      this.light = light

      const d = 5
      this.light.shadow.camera.top = d
      this.light.shadow.camera.bottom = -d
      this.light.shadow.camera.left = -d
      this.light.shadow.camera.right = d

      this.lights.helper.directionalLightHelper(light)

      const shadowHelper = new THREE.CameraHelper(light.shadow.camera)
      this.scene.add(shadowHelper)
    }

    this.load.texture('grass').then(grass => {
      grass.wrapS = grass.wrapT = 1000 // RepeatWrapping
      grass.offset.set(0, 0)
      grass.repeat.set(20, 20)

      let ground = this.physics.add.ground({ width: 200, height: 200, y: 0 }, { phong: { map: grass } })
      ground.body.setFriction(1)
    })

    this.physics.debug?.enable()
    // this.physics.debug?.mode(2048 + 4096)

    this.camera.position.set(0, 5, -10)

    const wheels = {
      front: { left: this.addWheel(1.5, 1.5), right: this.addWheel(-1.5, 1.5) },
      back: { left: this.addWheel(1.5, -1.5), right: this.addWheel(-1.5, -1.5) }
    }

    const body = this.addBody()
    body.add(this.camera)

    const axis = { front: this.addAxis(1.5), back: this.addAxis(-1.5) }

    const car = { body, axis, wheels }
    this.car = car

    // constraints

    this.physics.add.constraints.fixed(body.body, axis.back.body)

    this.axis = this.physics.add.constraints.hinge(body.body, axis.front.body, {
      pivotA: { z: 1.5, y: -0.5 },
      pivotB: {},
      axisA: { y: 1 },
      axisB: { y: 1 }
      // angularLowerLimit: {
      //   x: 0,
      //   y: -0.3,
      //   z: 0
      // },
      // angularUpperLimit: {
      //   x: 0,
      //   y: 0.3,
      //   z: 0
      // }
    })
    this.axis.setLimit(-0.4, 0.4, 1, 1)
    this.axis.enableAngularMotor(true, 0, 100000.0)

    const wheelLeft = { pivotA: { x: 1.25 }, pivotB: { x: 0 }, axisA: { x: 1 }, axisB: { y: -1 } }
    const wheelRight = { pivotA: { x: -1.25 }, pivotB: { x: 0 }, axisA: { x: 1 }, axisB: { y: -1 } }

    this.physics.add.constraints.hinge(axis.front.body, wheels.front.left.body, {
      ...wheelLeft
    })
    this.physics.add.constraints.hinge(axis.front.body, wheels.front.right.body, {
      ...wheelRight
    })
    this.physics.add.constraints.hinge(axis.back.body, wheels.back.left.body, {
      ...wheelLeft
    })
    this.physics.add.constraints.hinge(axis.back.body, wheels.back.right.body, {
      ...wheelRight
    })

    const press = (e: KeyboardEvent, isDown: boolean) => {
      e.preventDefault()
      const { code } = e
      switch (code) {
        case 'KeyW':
          this.keys.w = isDown
          break
        case 'KeyA':
          this.keys.a = isDown
          break
        case 'KeyS':
          this.keys.s = isDown
          break
        case 'KeyD':
          this.keys.d = isDown
          break
      }
    }

    document.addEventListener('keydown', e => press(e, true))
    document.addEventListener('keyup', e => press(e, false))
  }

  update() {
    this.light.position.x = this.car.body.position.x
    this.light.position.y = this.car.body.position.y + 200
    this.light.position.z = this.car.body.position.z + 100
    this.light.target = this.car.body

    this.camera.lookAt(this.car.body.position)
    // this.light.position.copy(this.car.body)
    // this.light.position.add(new THREE.Vector3(-5, 9, 3))

    const move = (direction: number) => {
      const force = 6
      this.car.wheels.front.left.body.applyLocalTorque(0, direction * force, 0)
      this.car.wheels.front.right.body.applyLocalTorque(0, direction * force, 0)
    }

    const turn = (direction: number) => {
      const dt = 0.5

      this.axis.setMotorTarget(direction, dt)
      //   this.car.axis.front.body.applyLocalTorque(0, direction * force, 0)
      //   this.car.axis.front.body.applyLocalTorque(0, direction * force, 0)
    }

    if (this.keys.w) move(-1)
    else if (this.keys.s) move(1)

    if (this.keys.a) turn(1)
    else if (this.keys.d) turn(-1)
    else this.axis.setMotorTarget(0, 1)
  }
}

const startProject = () => {
  PhysicsLoader('/lib', () => new Project({ scenes: [MainScene] }))
}

export default startProject
