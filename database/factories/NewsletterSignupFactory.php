<?php

namespace Database\Factories;

use App\Models\NewsletterSignup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NewsletterSignup>
 */
class NewsletterSignupFactory extends Factory
{
    protected $model = NewsletterSignup::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional(0.7)->phoneNumber(),
            'gdpr' => true,
            'newsletter_agreement' => fake()->boolean(85),
        ];
    }
}
