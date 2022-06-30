'use strict'

const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')
const sidebar = document.querySelector('.sidebar')
const deleteWorkoutsBtn = document.querySelector('.btn__clear')
const dots = document.querySelector('.workout__dots')
const errorBox = document.querySelector('.form__error')

///////////////////////////////////////////
// CLASS -WORKOUT-
class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)

  constructor(coords, distance, duration) {
    this.coords = coords // [lat, lng]
    this.distance = distance // in km
    this.duration = duration // in min
  }

  _setDescription(description) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`
  }
}

///////////////////////////////////////////
// CLASS -RUNNING-
class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance
    return this.pace
  }
}
class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration)
    this.elevation = elevation
    this.calcSpeed()
    this._setDescription()

    console.log(this)
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

///////////////////////////////////////////
// CLASS -APP-
class App {
  #map
  #mapZoomLvl = 13
  #mapEvent
  #latLng
  #workouts = []
  #editState = false
  #workoutIndex

  constructor() {
    // Get users position
    this._getPosition()

    // Get data from localstorage
    this._getLocalStorage()

    // Handle reset button
    this._setResetBtnState()

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this))
    inputType.addEventListener('change', this._toggleElevationField.bind(this))
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    containerWorkouts.addEventListener('click', this._enableEdit.bind(this))
    containerWorkouts.addEventListener('click', this._delete.bind(this))
    sidebar.addEventListener('click', this._workoutMenu.bind(this))
    sidebar.addEventListener('click', this._reset.bind(this))
  }

  _enableEdit(e) {
    if (e.target.classList.contains('edit')) {
      // Show form
      this._showForm()
      // Enable editing state
      this.#editState = true

      // Set form values to desired workout info
      const workoutId = +e.target.closest('.workout').dataset.id
      const workoutIndex = this._findWorkoutIndex(e)
      const workoutForEditing = this.#workouts[workoutIndex]

      // Change ddl
      const options = Array.from(inputType.options)
      const optionToSelect = options.find(
        opt => opt.value === workoutForEditing.type
      )
      optionToSelect.selected = true

      inputDistance.value = workoutForEditing.distance
      inputDuration.value = workoutForEditing.duration

      if (workoutForEditing.type === 'running') {
        inputElevation.closest('.form__row').classList.add('form__row--hidden')
        inputCadence.closest('.form__row').classList.remove('form__row--hidden')

        inputCadence.value = workoutForEditing.cadence
      }

      if (workoutForEditing.type === 'cycling') {
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden')
        inputCadence.closest('.form__row').classList.add('form__row--hidden')

        inputElevation.value = workoutForEditing.elevation
      }

      this.#workoutIndex = workoutIndex
      this.#latLng = workoutForEditing.coords
    }
  }

  _delete(e) {
    if (e.target.classList.contains('delete')) {
      const workoutIndex = this._findWorkoutIndex(e)
      this.#workouts.splice(workoutIndex, 1)

      this._setLocalStorage()
      this._getLocalStorage()
      location.reload()
    }
  }

  _findWorkoutIndex(e) {
    const workoutEl = e.target.closest('.workout')

    const workoutIndex = this.#workouts.indexOf(
      this.#workouts.find(work => work.id === workoutEl.dataset.id)
    )

    return workoutIndex
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location')
        }
      )
  }

  _loadMap(position) {
    const { latitude } = position.coords
    const { longitude } = position.coords

    const coords = [latitude, longitude]

    this.#map = L.map('map').setView(coords, this.#mapZoomLvl)

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">Vladimir Mijajlovic</a>',
    }).addTo(this.#map)

    this.#map.on('click', this._showForm.bind(this))

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout)
    })
  }

  _showForm(event) {
    form.classList.remove('hidden')
    inputDistance.focus()

    this.#mapEvent = event
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ''

    form.style.display = 'none'
    form.classList.add('hidden')

    setTimeout(() => {
      form.style.display = 'grid'
    }, 1000)
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')

    if (!workoutEl) return
    if (
      e.target.classList.contains('workout__dots') ||
      e.target.classList.contains('dot')
    )
      return

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    )

    this.#map.setView(workout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    })
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
  }

  // Render modal with appropriate info whenever form is submited incorectly
  _validate(formInfo) {
    const [type, distance, duration, cadElev] = formInfo

    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input))

    const allPositive = (...inputs) => inputs.every(input => input > 0)

    if (type === 'running') {
      if (
        !validInputs(distance, duration, cadElev) ||
        !allPositive(distance, duration, cadElev)
      ) {
        this._errorBox(false)
        return false
      } else {
        this._errorBox(true)
        return true
      }
    }
    if (type === 'cycling') {
      if (
        !validInputs(distance, duration, cadElev) ||
        !allPositive(distance, duration)
      ) {
        this._errorBox(false)
        return false
      } else {
        this._errorBox(true)
        return true
      }
    }
  }

  _errorBox(isOk) {
    if (!isOk) {
      errorBox.classList.remove('form__error--hidden')
      setTimeout(() => {
        errorBox.classList.add('form__error--hidden')
      }, 10000)
    }

    if (isOk) {
      errorBox.classList.add('form__error--hidden')
    }
  }

  _newWorkout(e) {
    e.preventDefault()

    let workout

    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value

    const cadence = +inputCadence.value
    const elevation = +inputElevation.value

    const formInfo = [
      type,
      distance,
      duration,
      type === 'running' ? cadence : elevation,
    ]

    const newWorkoutObj = function (type, coords) {
      if (type === 'running') {
        workout = new Running(coords, distance, duration, cadence)
      }
      if (type === 'cycling') {
        workout = new Cycling(coords, distance, duration, elevation)
      }
    }

    // UPDATE WORKOUT
    if (this.#editState) {
      const [editLatitude, editLongitude] = this.#latLng

      if (!this._validate(formInfo)) return
      this._hideForm()
      newWorkoutObj(type, [editLatitude, editLongitude])

      // Replace old workout with new one
      this.#workouts.splice(this.#workoutIndex, 1, workout)

      this._setLocalStorage()
      location.reload()

      return
    }

    // ADD NEW WORKOUT
    const { lat, lng } = this.#mapEvent.latlng

    // Validate form and add new create new workout
    if (!this._validate(formInfo)) return
    newWorkoutObj(type, [lat, lng])

    // Add new obj to workout array
    this.#workouts.push(workout)

    // Render workout on map as marker
    this._renderWorkoutMarker(workout)

    // Render workout on list
    this._renderWorkout(workout)

    // Hide form after rendering workout
    this._hideForm()

    // Save workouts in localstorage
    this._setLocalStorage()

    // Show reset/delete button
    this.#workouts.length !== 0 && this._setResetBtnState()
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup()
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <div class="workout__head">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__dots">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🗻</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `
    }

    form.insertAdjacentHTML('afterend', html)
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'))

    if (!data) return

    this.#workouts = data
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout)
    })
  }

  _reset(e) {
    if (!e.target.classList.contains('btn__clear')) return
    if (!this.#workouts) return

    localStorage.removeItem('workout')
    this._setResetBtnState()
    location.reload()
  }

  _setResetBtnState() {
    this.#workouts.length === 0
      ? deleteWorkoutsBtn.classList.add('btn__clear--hidden')
      : deleteWorkoutsBtn.classList.remove('btn__clear--hidden')
  }

  _workoutMenu(e) {
    const menu = document.querySelector('.workout__menu')
    const workoutElement = e.target.closest('.workout')

    const dotMenuHtml = () => {
      return `
        <div class="workout__menu">
          <ul>
            <li class="edit">Edit</li>
            <li class="delete">Delete</li>
          </ul>
        </div>
      `
    }

    if (
      e.target.classList.contains('workout__dots') ||
      e.target.classList.contains('dot')
    ) {
      !menu && workoutElement.insertAdjacentHTML('beforeend', dotMenuHtml())
      menu && menu.remove()
    }

    if (
      menu &&
      (!e.target.classList.contains('workout__dots') ||
        !e.target.classList.contains('dot'))
    ) {
      menu.remove()
    }
  }
}

const app = new App()
