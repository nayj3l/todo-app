import { expect, test, type Page } from '@playwright/test'

const DEFAULT_TASK_TITLE = 'New task'

async function signInAsGuest(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('google-sign-in')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('guest-nickname').fill('Playwright')
  await page.getByTestId('guest-acknowledge').check()
  await page.getByTestId('guest-sign-in').click()
  await expect(page.getByTestId('guest-sign-in')).not.toBeVisible({ timeout: 20_000 })
}

async function readTitleInputSelection(page: Page) {
  const input = page.getByTestId('task-title-input')
  return input.evaluate((el: HTMLInputElement) => ({
    value: el.value,
    selectionStart: el.selectionStart,
    selectionEnd: el.selectionEnd,
    isFocused: document.activeElement === el,
  }))
}

test.describe('New task auto-edit focus', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies()
    await context.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await signInAsGuest(page)
  })

  test('focuses title with full selection and survives task-created toast', async ({ page }) => {
    await page.getByTestId('add-task-card').first().click()

    const titleInput = page.getByTestId('task-title-input')
    await expect(titleInput).toBeVisible({ timeout: 10_000 })
    await expect(titleInput).toBeFocused({ timeout: 5_000 })

    let selection = await readTitleInputSelection(page)
    expect(selection.value).toBe(DEFAULT_TASK_TITLE)
    expect(selection.selectionStart).toBe(0)
    expect(selection.selectionEnd).toBe(DEFAULT_TASK_TITLE.length)
    expect(selection.isFocused).toBe(true)

    await expect(page.getByText('Task created', { exact: true })).toBeVisible({ timeout: 5_000 })

    await expect(titleInput).toBeFocused({ timeout: 2_000 })
    selection = await readTitleInputSelection(page)
    expect(selection.isFocused).toBe(true)
    expect(selection.selectionStart).toBe(0)
    expect(selection.selectionEnd).toBe(DEFAULT_TASK_TITLE.length)

    await page.keyboard.type('Buy flowers')
    await expect(titleInput).toHaveValue('Buy flowers')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Buy flowers', { exact: true })).toBeVisible()
  })

  test('add new task control is centered with a plus icon', async ({ page }) => {
    const addCard = page.getByTestId('add-task-card').first()
    await expect(addCard).toBeVisible()
    await expect(addCard).toContainText('Add new task')

    const box = await addCard.boundingBox()
    const textBox = await addCard.locator('span').last().boundingBox()
    expect(box).not.toBeNull()
    expect(textBox).not.toBeNull()
    if (box && textBox) {
      const textCenterX = textBox.x + textBox.width / 2
      const cardCenterX = box.x + box.width / 2
      expect(Math.abs(textCenterX - cardCenterX)).toBeLessThan(48)
    }
  })
})
