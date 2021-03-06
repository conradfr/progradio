defmodule ProgRadioApi.SongProvider.Fip do
  require Logger
  alias ProgRadioApi.SongProvider

  @behaviour ProgRadioApi.SongProvider

  @refresh_fallback 3

  @stream_ids %{
    "fip_main" => 7,
    "fip_rock" => 64,
    "fip_jazz" => 65,
    "fip_groove" => 66,
    "fip_pop" => 78,
    "fip_electro" => 74,
    "fip_monde" => 69,
    "fip_reggae" => 71,
    "fip_nouveautes" => 70
  }

  @impl true
  def has_custom_refresh(), do: true

  @impl true
  def get_auto_refresh(_name, _data, default_refresh), do: default_refresh

  @impl true
  def get_refresh(_name, nil, default_refresh), do: default_refresh

  @impl true
  def get_refresh(_name, data, default_refresh) do
    now_unix = SongProvider.now_unix()
    next = Map.get(data, "next_refresh", now_unix + default_refresh / 1000) + 5 - now_unix

    if next < @refresh_fallback do
      @refresh_fallback * 1000
    else
      next * 1000
    end
  end

  @impl true
  def get_data(name, _last_data) do
    id =
      SongProvider.get_stream_code_name_from_channel(name)
      |> (&Map.get(@stream_ids, &1)).()

    url =
      "https://www.fip.fr/latest/api/graphql?operationName=NowList&variables={\"bannerPreset\":\"266x266\",\"stationIds\":[#{id}]}&extensions={\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"151ca055b816d28507dae07f9c036c02031ed54e18defc3d16feee2551e9a731\"}}"

    url
    |> SongProvider.get()
    |> Map.get(:body)
    |> Jason.decode!()
    |> Map.get("data", %{})
    |> Map.get("nowList", %{})
    |> List.first()
  end

  @impl true
  def get_song(name, data) do
    case data do
      nil ->
        Logger.info("Data provider - #{name}: error fetching song data or empty")
        %{}

      _ ->
        %{artist: data["playing_item"]["title"], title: data["playing_item"]["subtitle"]}
    end
  end
end
