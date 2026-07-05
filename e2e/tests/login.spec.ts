import { expect, test } from '@playwright/test'

test.describe('Altar Board login', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await context.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('shows login page with Google and guest options', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Altar Board' })).toBeVisible()
    await expect(page.getByTestId('google-sign-in')).toBeVisible()
    await expect(page.getByTestId('guest-sign-in')).toBeVisible()
  })

  test('guest sign-in loads the wedding planner board', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('google-sign-in')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('guest-nickname').fill('Playwright')
    await page.getByTestId('guest-acknowledge').check()
    await page.getByTestId('guest-sign-in').click()

    await expect(page.getByTestId('guest-sign-in')).not.toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Playwright', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Guest · saved on this browser')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Planning & Timeline', exact: true })).toBeVisible()
  })

  test('google sign-in button does not stay stuck on Signing in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('google-sign-in')).toBeVisible({ timeout: 15_000 })

    const googleButton = page.getByTestId('google-sign-in')
    const popupPromise = page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null)
    await googleButton.click()
    const popup = await popupPromise
    if (popup) {
      await popup.close()
    }

    await expect(googleButton).toHaveText('Continue with Google', { timeout: 20_000 })
    await expect(googleButton).toBeEnabled()
  })
})
