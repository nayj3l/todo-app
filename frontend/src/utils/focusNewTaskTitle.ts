/** Windows-style rename: focus the title field with the full default name selected. */
export function focusNewTaskTitleInput(input: HTMLInputElement | null | undefined) {
  if (!input) {
    return
  }

  input.focus({ preventScroll: false })
  const end = input.value.length
  try {
    input.setSelectionRange(0, end)
  } catch {
    input.select()
  }
}

export function scheduleFocusNewTaskTitleInput(
  getInput: () => HTMLInputElement | null | undefined,
) {
  focusNewTaskTitleInput(getInput())
  requestAnimationFrame(() => focusNewTaskTitleInput(getInput()))
  window.setTimeout(() => focusNewTaskTitleInput(getInput()), 0)
  window.setTimeout(() => focusNewTaskTitleInput(getInput()), 16)
  window.setTimeout(() => focusNewTaskTitleInput(getInput()), 50)
  window.setTimeout(() => focusNewTaskTitleInput(getInput()), 120)
}
