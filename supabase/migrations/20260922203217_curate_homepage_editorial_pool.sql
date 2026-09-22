update public.reflection_quotes
set placements = array_remove(placements, 'homepage'),
    updated_at = now()
where 'homepage' = any(placements);

update public.reflection_quotes
set placements = placements || array['homepage']::text[],
    updated_at = now()
where id in (
  'c55ea593-1f58-49ee-8ee9-ddf466f528a3',
  'db6e685c-5ff3-4ebd-90b1-724cebda87e1',
  'c047d9d5-3b1b-4f47-aa1d-3e4c724cd074',
  '773e6182-fa6e-40aa-9c66-071d3e0c4711',
  'fabce5df-733e-4026-9bda-41a0924b3898',
  '9e2f6fcd-463c-4e03-84d5-ba64473d85f4',
  '3532beb5-9600-4166-988c-19b04360b354',
  'cf6dece6-bc43-49a5-a295-f5fc521904e8',
  '8b38ee16-9e31-4849-828a-da65e8957cc2',
  '976cf9f0-d353-4b54-a9e7-626884fec67d',
  '43ee8248-fa2f-44bf-aff8-93eeecc8c3d4',
  '8854f7d0-ae40-4634-852f-7a5222125366',
  '5fbd6de2-3c7c-4760-a634-51e66931c883',
  '83402289-3414-4e25-818e-a0845671a6f3',
  '8983e649-8bb0-46f3-b6a6-8360d138113e',
  'db30e520-3061-4f19-9b6b-6872deb7be00',
  '361ecffd-2a62-4d52-9139-7279caeb6624',
  'bf039ab7-819f-4025-8e34-2389f0ccd30c'
)
and active = true
and not ('homepage' = any(placements));
