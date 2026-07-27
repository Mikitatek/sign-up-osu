<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * The home page currently redirects to the shop.
     */
    public function test_the_home_page_redirects_to_the_shop(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('magazin'));
    }
}
