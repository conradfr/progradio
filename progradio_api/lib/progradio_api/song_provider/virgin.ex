defmodule ProgRadioApi.SongProvider.Virgin do
  require Logger
  alias ProgRadioApi.SongProvider

  @behaviour ProgRadioApi.SongProvider

  @stream_ids %{
    "virgin_main" => 2
  }

  @range_minutes 300

  @impl true
  def has_custom_refresh(), do: true

  @impl true
  def get_refresh(_name, data, default_refresh) do
    case data do
      nil ->
        nil

      _ ->
        now_unix =
          DateTime.now!("Europe/Paris")
          |> DateTime.to_unix()

        next = Map.get(data, "date_end", now_unix + default_refresh / 1000) + 2 - now_unix

        if now_unix + next < now_unix do
          default_refresh
        else
          next * 1000
        end
    end
  end

  @impl true
  def get_data(name) do
    id =
      SongProvider.get_stream_code_name_from_channel(name)
      |> (&Map.get(@stream_ids, &1)).()

    {:ok, now} = DateTime.now("Europe/Paris")

    now_unix = DateTime.to_unix(now)

    prev =
      now
      |> DateTime.add(-@range_minutes)
      |> Timex.format!("{YYYY}-{0M}-{0D} {h24}:{m}:{s}")

    next =
      now
      |> DateTime.add(@range_minutes)
      |> Timex.format!("{YYYY}-{0M}-{0D} {h24}:{m}:{s}")

    HTTPoison.get!(
      "https://www.virginradio.fr/radio/api/get_all_events.json/argv/id_radio/#{id}/start/#{prev}/end/#{
        next
      }",
      [],
      ssl: [ciphers: :ssl.cipher_suites(), versions: [:"tlsv1.2", :"tlsv1.1", :tlsv1]]
    )
    |> Map.get(:body)
    |> Jason.decode!()
    |> Map.get("root_tab", %{})
    |> Map.get("event", [])
    |> Enum.find(nil, fn e ->
      now_unix >= e["date_created"] and now_unix <= e["date_end"]
    end)
  end

  @impl true
  def get_song(name, data) do
    case data do
      nil ->
        Logger.info("Data provider - #{name}: error fetching song data or empty")
        %{}

      _ ->
        %{interpreter: data["artist"], title: data["title"]}
    end
  end
end