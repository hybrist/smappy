/**
 * Button component for the fixture app
 */

export class Button {
  constructor(label) {
    this.label = label;
    this.element = null;
  }

  render() {
    this.element = document.createElement('button');
    this.element.textContent = this.label;
    this.element.className = 'btn btn-primary';
    this.element.addEventListener('click', () => this.handleClick());
    return this.element;
  }

  handleClick() {
    console.log(`Button "${this.label}" clicked`);
    if (this.element) {
      this.element.classList.add('clicked');
    }
  }

  destroy() {
    if (this.element) {
      this.element.removeEventListener('click', this.handleClick);
      this.element.remove();
      this.element = null;
    }
  }
}
