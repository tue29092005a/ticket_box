---
created: 2026-07-03
updated: 2026-07-03 22:07
tags:
---
```
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 304
ETag: W/"130-uft3IuvCvlGsnUkVQU3zBupEZRA"
Date: Fri, 03 Jul 2026 15:07:34 GMT
Connection: close

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNzMwMWZmMS0zMzEzLTQ4Y2YtYWIyMy00ZTE2MTlhZWNlMzkiLCJpYXQiOjE3ODMwOTEyNTQsImV4cCI6MTc4MzA5MjE1NH0.UK9kXdHDYdTCbPRkOTX4dWQWnb2jQvPFci0LnDOl2rw",
  "refreshToken": "00bf59126da16782f688d37d6e7c02dd731ce758e4eca82bd93335ff131ce3cec744501b48a3cbc1"
}
```
### 3. Create Draft (Step 1 Initiation)
```
HTTP/1.1 201 Created X-Powered-By: Express Access-Control-Allow-Origin: * Content-Type: application/json; charset=utf-8 Content-Length: 136 ETag: W/"88-quSEMU8BGar4vgLi4i3jybCXjxc" Date: Fri, 03 Jul 2026 15:07:55 GMT Connection: close { "event_id": "cfe7f0a4-af86-4a65-b37e-d0e6dbd43ce6", "status": "DRAFT", "current_step": 1, "message": "Draft created. Proceed to fill step 1." }
```

### 4. Save Step 1 (Event Info)
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 101
ETag: W/"65-0qetPRH/tavmYuxazNaaX2bjiKE"
Date: Fri, 03 Jul 2026 15:08:15 GMT
Connection: close

{
  "event_id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "status": "DRAFT",
  "step_completed": 1,
  "next_step": 2
}
```
### 5. Save Step 2 (Datetime & Tickets)
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 124
ETag: W/"7c-zVZQyurNCjoKbtOGT45JCRpYThs"
Date: Fri, 03 Jul 2026 15:08:35 GMT
Connection: close

{
  "event_id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "status": "DRAFT",
  "step_completed": 2,
  "next_step": 3,
  "ticket_types_saved": 2
}
```
### 6. Save Step 3 (Settings)
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 160
ETag: W/"a0-0soi26ufw3l4N4ev4+VzzKaZVcE"
Date: Fri, 03 Jul 2026 15:08:54 GMT
Connection: close

{
  "event_id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "status": "DRAFT",
  "step_completed": 3,
  "next_step": 4,
  "event_url": "https://ticketbox.vn/my-awesome-concert-2026"
}
```
### 7. Save Step 4 (Payment & Publish)
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 170
ETag: W/"aa-WKYn9EPQna1U6eKE1gGsPb9kL8A"
Date: Fri, 03 Jul 2026 15:09:11 GMT
Connection: close

{
  "event_id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "status": "ACTIVE",
  "message": "Event published successfully.",
  "event_url": "https://ticketbox.vn/my-awesome-concert-2026"
}
```

### 8. Get Draft Status
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 1394
ETag: W/"572-5/8ltsXmH8fyfED4RdIB7MbizOI"
Date: Fri, 03 Jul 2026 15:09:20 GMT
Connection: close

{
  "event_id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "status": "ACTIVE",
  "current_step": 4,
  "step_1": {
    "name": "My Awesome Concert",
    "category": "Music",
    "address_type": "OFFLINE",
    "venue_name": "My Arena",
    "province": "Hanoi",
    "ward": "Dich Vong",
    "street": "123 Xuan Thuy",
    "organizer_name": "Super Organizer",
    "description": "The best concert ever"
  },
  "step_2": {
    "start_time": "2026-10-15T20:00:00.000Z",
    "ticket_types": [
      {
        "id": "4c3bdcff-e471-4397-9f37-a4efe08afe0a",
        "showId": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
        "name": "VIP",
        "price": 1000000,
        "is_free": false,
        "total_quantity": 50,
        "min_per_order": 1,
        "max_per_order": 4,
        "sale_start": null,
        "sale_end": null,
        "description": null,
        "ticket_image_url": null,
        "sort_order": 0,
        "created_at": "2026-07-03T08:08:36.367Z",
        "updated_at": "2026-07-03T08:08:36.367Z"
      },
      {
        "id": "172b70ef-1bfa-499b-b1c0-cbaf3bab7e64",
        "showId": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
        "name": "GA",
        "price": 500000,
        "is_free": false,
        "total_quantity": 200,
        "min_per_order": 1,
        "max_per_order": 10,
        "sale_start": null,
        "sale_end": null,
        "description": null,
        "ticket_image_url": null,
        "sort_order": 1,
        "created_at": "2026-07-03T08:08:36.367Z",
        "updated_at": "2026-07-03T08:08:36.367Z"
      }
    ]
  },
  "step_3": {
    "slug": "my-awesome-concert-2026",
    "privacy": "PUBLIC",
    "confirmation_message": "Thanks for buying! See you at the event."
  },
  "step_4": {
    "bank_account_name": "SUPER ORGANIZER",
    "bank_account_number": "123456789",
    "bank_name": "VCB",
    "vat_business_type": "INDIVIDUAL"
  }
}

```

### 9. List All Events (Public)
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 360
ETag: W/"168-0ZljliSyDAz2cuzjWKnLrogUoRE"
Date: Fri, 03 Jul 2026 15:09:40 GMT
Connection: close

{
  "data": [
    {
      "id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
      "name": "My Awesome Concert",
      "date": "2026-10-15T20:00:00.000Z",
      "start_time": "2026-10-15T20:00:00.000Z",
      "venue_name": "My Arena",
      "province": "Hanoi",
      "image_url": null,
      "cover_image_url": null,
      "category": "Music",
      "status": "ACTIVE",
      "privacy": "PUBLIC",
      "slug": "my-awesome-concert-2026"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```
### 9. List All Events (Public)

```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 1114
ETag: W/"45a-ZHozjgHpdhPD9QgqXVWRD2AUjwA"
Date: Fri, 03 Jul 2026 15:09:50 GMT
Connection: close

{
  "id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "name": "My Awesome Concert",
  "description": "Updated concert description!",
  "category": "Music",
  "address_type": "OFFLINE",
  "venue_name": "My Arena",
  "province": "Hanoi",
  "ward": "Dich Vong",
  "street": "123 Xuan Thuy",
  "image_url": null,
  "cover_image_url": null,
  "organizer_name": "Super Organizer",
  "organizer_info": null,
  "organizer_logo_url": null,
  "privacy": "PUBLIC",
  "slug": "my-awesome-concert-2026",
  "status": "ACTIVE",
  "start_time": "2026-10-15T20:00:00.000Z",
  "ticket_types": [
    {
      "id": "0e53dd6a-4501-4639-ab79-7d034f6996c9",
      "name": "VIP",
      "price": 1000000,
      "is_free": false,
      "total_quantity": 50,
      "available": 0,
      "reserved": 0,
      "sold": 0,
      "locked": 0,
      "min_per_order": 1,
      "max_per_order": 4,
      "sale_start": null,
      "sale_end": null,
      "description": null,
      "ticket_image_url": null
    },
    {
      "id": "8430ecc0-742a-4240-b894-8d8c6040a503",
      "name": "GA",
      "price": 500000,
      "is_free": false,
      "total_quantity": 200,
      "available": 0,
      "reserved": 0,
      "sold": 0,
      "locked": 0,
      "min_per_order": 1,
      "max_per_order": 10,
      "sale_start": null,
      "sale_end": null,
      "description": null,
      "ticket_image_url": null
    }
  ],
  "created_at": "2026-07-03T08:04:48.194Z",
  "cache_hit": true,
  "cache_ttl": 600
}
```

### 10. Get Public Event Detail
```
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 1114
ETag: W/"45a-ZHozjgHpdhPD9QgqXVWRD2AUjwA"
Date: Fri, 03 Jul 2026 15:10:16 GMT
Connection: close

{
  "id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3",
  "name": "My Awesome Concert",
  "description": "Updated concert description!",
  "category": "Music",
  "address_type": "OFFLINE",
  "venue_name": "My Arena",
  "province": "Hanoi",
  "ward": "Dich Vong",
  "street": "123 Xuan Thuy",
  "image_url": null,
  "cover_image_url": null,
  "organizer_name": "Super Organizer",
  "organizer_info": null,
  "organizer_logo_url": null,
  "privacy": "PUBLIC",
  "slug": "my-awesome-concert-2026",
  "status": "ACTIVE",
  "start_time": "2026-10-15T20:00:00.000Z",
  "ticket_types": [
    {
      "id": "0e53dd6a-4501-4639-ab79-7d034f6996c9",
      "name": "VIP",
      "price": 1000000,
      "is_free": false,
      "total_quantity": 50,
      "available": 0,
      "reserved": 0,
      "sold": 0,
      "locked": 0,
      "min_per_order": 1,
      "max_per_order": 4,
      "sale_start": null,
      "sale_end": null,
      "description": null,
      "ticket_image_url": null
    },
    {
      "id": "8430ecc0-742a-4240-b894-8d8c6040a503",
      "name": "GA",
      "price": 500000,
      "is_free": false,
      "total_quantity": 200,
      "available": 0,
      "reserved": 0,
      "sold": 0,
      "locked": 0,
      "min_per_order": 1,
      "max_per_order": 10,
      "sale_start": null,
      "sale_end": null,
      "description": null,
      "ticket_image_url": null
    }
  ],
  "created_at": "2026-07-03T08:04:48.194Z",
  "cache_hit": true,
  "cache_ttl": 600
}
```
### 11. Admin: Update Event
```
HTTP/1.1 200 OK X-Powered-By: Express Access-Control-Allow-Origin: * Content-Type: application/json; charset=utf-8 Content-Length: 1099 ETag: W/"44b-7vmQocME2NEiS4HQUpSkrKEiCGU" Date: Fri, 03 Jul 2026 15:10:41 GMT Connection: close { "id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3", "name": "My Awesome Concert", "description": "Updated concert description!", "category": "Music", "address_type": "OFFLINE", "venue_name": "My Arena", "province": "Hanoi", "ward": "Dich Vong", "street": "123 Xuan Thuy", "image_url": null, "cover_image_url": null, "organizer_name": "Super Organizer", "organizer_info": null, "organizer_logo_url": null, "privacy": "PUBLIC", "slug": "my-awesome-concert-2026", "status": "ACTIVE", "start_time": "2026-10-15T20:00:00.000Z", "ticket_types": [ { "id": "4c3bdcff-e471-4397-9f37-a4efe08afe0a", "name": "VIP", "price": 1000000, "is_free": false, "total_quantity": 50, "available": 0, "reserved": 0, "sold": 0, "locked": 0, "min_per_order": 1, "max_per_order": 4, "sale_start": null, "sale_end": null, "description": null, "ticket_image_url": null }, { "id": "172b70ef-1bfa-499b-b1c0-cbaf3bab7e64", "name": "GA", "price": 500000, "is_free": false, "total_quantity": 200, "available": 0, "reserved": 0, "sold": 0, "locked": 0, "min_per_order": 1, "max_per_order": 10, "sale_start": null, "sale_end": null, "description": null, "ticket_image_url": null } ], "created_at": "2026-07-03T08:04:48.194Z", "cache_hit": false }
```

### 12. Admin: Cancel Event
```
HTTP/1.1 200 OK X-Powered-By: Express Access-Control-Allow-Origin: * Content-Type: application/json; charset=utf-8 Content-Length: 121 ETag: W/"79-bo74MhvYqkices8cW/M+TGh05tA" Date: Fri, 03 Jul 2026 15:11:02 GMT Connection: close { "id": "6f71fefb-3fe1-49db-9fb2-a316d66846f3", "status": "CANCELLED", "message": "Event cancelled. Refund process initiated." }
```

