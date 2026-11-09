<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->nullable()->unique();
            $table->string('status')->index();
            $table->string('payment_method');
            $table->string('stripe_session_id')->nullable()->unique();
            $table->string('contact_name');
            $table->string('contact_phone');
            $table->string('contact_email');
            $table->string('delivery_type');
            $table->string('street')->nullable();
            $table->string('apartment')->nullable();
            $table->string('staircase')->nullable();
            $table->string('floor')->nullable();
            $table->string('city')->nullable();
            $table->text('notes')->nullable();
            $table->string('scheduled_date')->nullable();
            $table->string('scheduled_time')->nullable();
            $table->json('items');
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->unsignedInteger('transport_fee')->default(0); // bani
            $table->unsignedInteger('total'); // bani
            $table->timestamp('placed_at')->nullable()->index();
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
