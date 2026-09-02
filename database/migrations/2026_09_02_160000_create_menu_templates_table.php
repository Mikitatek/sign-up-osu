<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('note')->nullable();
            $table->unsignedInteger('product_count')->default(0);
            $table->boolean('auto')->default(false); // snapshot luat automat înainte de restore
            $table->longText('payload'); // JSON: lista completă a produselor
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_templates');
    }
};
