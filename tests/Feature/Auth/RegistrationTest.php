<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Public registration is intentionally disabled (admin-only accounts).
     * These tests assert that the routes stay closed. When customer
     * registration is reintroduced (platform plan, Phase 2), replace them
     * with the standard Breeze registration tests.
     */
    public function test_registration_screen_is_not_available(): void
    {
        $response = $this->get('/register');

        $response->assertNotFound();
    }

    public function test_registration_endpoint_is_not_available(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertGuest();
        $response->assertStatus(405); // route doesn't accept POST
    }
}
